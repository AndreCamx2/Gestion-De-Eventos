from datetime import datetime, timedelta
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import SimpleTestCase, TransactionTestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.test import APITestCase

from apps.catalogo.models import Concepto
from apps.clientes.models import Cliente
from apps.salones.models import Montaje, Salon, SalonMontaje
from apps.sitios.models import Ciudad, Sitio
from apps.usuarios.models import Rol, Usuario

from .models import Cotizacion, CotizacionItem, MovimientoCotizacion
from .services import totales_linea

PASSWORD = "Clave-Segura-123"
LISTA = "/api/cotizaciones/"


def crear_usuario(username, codigo_rol):
    rol = Rol.objects.get(codigo=codigo_rol)
    return Usuario.objects.create_user(username=username, password=PASSWORD, rol=rol)


def detalle(pk):
    return f"{LISTA}{pk}/"


def hoy():
    return timezone.localdate()


class TotalesTests(SimpleTestCase):
    def test_redondeo_half_up_a_dos_decimales(self):
        # 0.10 x 5% = 0.005 -> 0.01 (con redondeo bancario daría 0.00)
        t = totales_linea(1, Decimal("0.10"), Decimal("5.00"))
        self.assertEqual(t, {"subtotal": Decimal("0.10"), "impuesto": Decimal("0.01"), "total": Decimal("0.11")})


class CotizacionBaseTest(APITestCase):
    """Datos comunes: un sitio con salón, montaje habilitado (aforo 120) y conceptos."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.cliente_user = crear_usuario("cliente@test.com", "cliente")
        cls.proveedor_user = crear_usuario("proveedor@test.com", "proveedor")

        ctg = Ciudad.objects.get(codigo="CTG")
        cls.sitio = Sitio.objects.create(nombre="Hotel Caribe", ciudad=ctg)
        cls.otro_sitio = Sitio.objects.create(nombre="Finca La Ceiba", ciudad=ctg)
        # Administra los dos sitios (SGDE-90): así "concepto de otro sitio" prueba la
        # regla salón/concepto, no el filtro por sitio (que se prueba en apps/sitios).
        cls.admin.sitios.add(cls.sitio, cls.otro_sitio)
        cls.salon = Salon.objects.create(sitio=cls.sitio, nombre="Salón Barú")
        cls.montaje = Montaje.objects.create(codigo="test_auditorio", nombre="Auditorio Test")
        cls.montaje_no_habilitado = Montaje.objects.create(codigo="test_coctel", nombre="Cóctel Test")
        SalonMontaje.objects.create(salon=cls.salon, montaje=cls.montaje, aforo=120)

        cls.cliente = Cliente.objects.create(
            tipo="natural", nombre="Ana Pérez", identificacion="1047000111", correo="ana@test.com"
        )
        cls.almuerzo = Concepto.objects.create(
            sitio=cls.sitio, nombre="Almuerzo ejecutivo", precio=Decimal("45000.00"), impuesto_pct=Decimal("8.00")
        )
        cls.video_beam = Concepto.objects.create(
            sitio=cls.sitio, nombre="Video beam", precio=Decimal("250000.00"), impuesto_pct=Decimal("19.00")
        )
        cls.inactivo = Concepto.objects.create(
            sitio=cls.sitio, nombre="Descontinuado", precio=Decimal("1000.00"), activo=False
        )
        cls.de_otro_sitio = Concepto.objects.create(
            sitio=cls.otro_sitio, nombre="Almuerzo finca", precio=Decimal("30000.00")
        )

    def payload(self, **cambios):
        datos = {
            "cliente": self.cliente.pk,
            "salon": self.salon.pk,
            "montaje": self.montaje.pk,
            "fecha_evento": str(hoy() + timedelta(days=40)),
            "cantidad_personas": 80,
            "validez_oferta": str(hoy() + timedelta(days=10)),
            "items": [
                {"concepto": self.almuerzo.pk, "cantidad": 80},
                {"concepto": self.video_beam.pk, "cantidad": 1},
            ],
        }
        datos.update(cambios)
        return datos

    def crear_en_bd(self, fecha_evento=None, validez_oferta=None, estado="cotizado"):
        """Crea una cotización directo en la base (sin pasar por las validaciones del API)."""
        cotizacion = Cotizacion.objects.create(
            sitio=self.sitio, cliente=self.cliente, usuario=self.admin, salon=self.salon,
            montaje=self.montaje, estado=estado, cantidad_personas=50,
            fecha_evento=fecha_evento or hoy() + timedelta(days=30),
            validez_oferta=validez_oferta or hoy() + timedelta(days=5),
        )
        CotizacionItem.objects.create(
            cotizacion=cotizacion, concepto=self.almuerzo, cantidad=50,
            precio_unitario=self.almuerzo.precio, impuesto_pct=self.almuerzo.impuesto_pct,
        )
        return cotizacion


class CrearCotizacionTests(CotizacionBaseTest):
    def test_sin_token_recibe_401(self):
        cot = self.crear_en_bd()
        self.assertEqual(self.client.get(LISTA).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post(LISTA, self.payload(), format="json").status_code, 401)
        self.assertEqual(self.client.get(detalle(cot.pk)).status_code, 401)

    def test_cliente_y_proveedor_reciben_403(self):
        cot = self.crear_en_bd()
        for usuario in (self.cliente_user, self.proveedor_user):
            self.client.force_authenticate(user=usuario)
            with self.subTest(rol=usuario.rol.codigo):
                self.assertEqual(self.client.get(LISTA).status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(self.client.post(LISTA, self.payload(), format="json").status_code, 403)
                self.assertEqual(self.client.get(detalle(cot.pk)).status_code, 403)
        self.assertEqual(Cotizacion.objects.count(), 1)

    def test_crea_cotizacion_con_totales_exactos(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post(LISTA, self.payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)

        self.assertEqual(r.data["estado"], "cotizado")
        self.assertEqual(r.data["sitio"], {"id": self.sitio.pk, "nombre": "Hotel Caribe"})
        self.assertEqual(r.data["cliente"], {
            "id": self.cliente.pk, "nombre": "Ana Pérez", "identificacion": "1047000111", "correo": "ana@test.com",
        })
        self.assertEqual(r.data["salon"], {"id": self.salon.pk, "nombre": "Salón Barú"})
        self.assertEqual(r.data["montaje"], {"id": self.montaje.pk, "nombre": "Auditorio Test"})
        self.assertEqual(r.data["aforo"], 120)
        self.assertEqual(r.data["creado_por"], "admin@test.com")

        almuerzo, video = r.data["items"]
        self.assertEqual(almuerzo["concepto_nombre"], "Almuerzo ejecutivo")
        self.assertEqual(
            [almuerzo["precio_unitario"], almuerzo["impuesto_pct"], almuerzo["subtotal"],
             almuerzo["impuesto"], almuerzo["total"]],
            ["45000.00", "8.00", "3600000.00", "288000.00", "3888000.00"],
        )
        self.assertEqual([video["subtotal"], video["impuesto"], video["total"]],
                         ["250000.00", "47500.00", "297500.00"])
        self.assertEqual([r.data["subtotal"], r.data["impuestos"], r.data["total"]],
                         ["3850000.00", "335500.00", "4185500.00"])

        cot = Cotizacion.objects.get(pk=r.data["id"])
        self.assertEqual(cot.sitio, self.sitio)
        self.assertEqual(cot.usuario, self.admin)
        self.assertEqual(cot.items.get(concepto=self.video_beam).impuesto_pct, Decimal("19.00"))

    def test_aforo_excedido(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post(LISTA, self.payload(cantidad_personas=121), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["cantidad_personas"], ["Supera el aforo del montaje (120 personas)."])
        self.assertFalse(Cotizacion.objects.exists())

    def test_cliente_inactivo_400_en_cliente(self):
        inactivo = Cliente.objects.create(
            tipo="natural", nombre="Luis Baja", identificacion="1047000222",
            correo="baja@test.com", activo=False,
        )
        self.client.force_authenticate(user=self.admin)
        r = self.client.post(LISTA, self.payload(cliente=inactivo.pk), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST, r.data)
        self.assertIn("cliente", r.data)
        self.assertEqual(Cotizacion.objects.count(), 0)
    

    def test_montaje_no_habilitado_en_el_salon(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post(LISTA, self.payload(montaje=self.montaje_no_habilitado.pk), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("montaje", r.data)

    def test_concepto_inactivo_y_de_otro_sitio_marcan_su_posicion(self):
        self.client.force_authenticate(user=self.admin)
        items = [
            {"concepto": self.almuerzo.pk, "cantidad": 1},
            {"concepto": self.inactivo.pk, "cantidad": 1},
            {"concepto": self.de_otro_sitio.pk, "cantidad": 1},
        ]
        r = self.client.post(LISTA, self.payload(items=items), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["items"][0], {})
        self.assertEqual(r.data["items"][1], {"concepto": ["El concepto está inactivo."]})
        self.assertEqual(r.data["items"][2], {"concepto": ["El concepto no pertenece al venue del salón."]})
        self.assertFalse(Cotizacion.objects.exists())

    def test_errores_de_campo_en_items_tambien_son_una_lista_por_posicion(self):
        """Concepto inexistente o cantidad inválida: mismo formato que las reglas de validate()."""
        self.client.force_authenticate(user=self.admin)
        items = [
            {"concepto": self.almuerzo.pk, "cantidad": 1},
            {"concepto": 999999, "cantidad": 1},
            {"concepto": self.almuerzo.pk, "cantidad": 0},
        ]
        r = self.client.post(LISTA, self.payload(items=items), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        errores = r.json()["items"]
        self.assertIsInstance(errores, list)
        self.assertEqual(len(errores), 3)
        self.assertEqual(errores[0], {})
        self.assertEqual(list(errores[1]), ["concepto"])
        self.assertEqual(list(errores[2]), ["cantidad"])
        self.assertFalse(Cotizacion.objects.exists())

    def test_errores_de_la_lista_entera_no_cambian(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post(LISTA, self.payload(items="no es una lista"), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", r.json()["items"])

    def test_sin_items_cantidad_cero_y_fecha_pasada(self):
        self.client.force_authenticate(user=self.admin)
        casos = {
            "items": self.payload(items=[]),
            "cantidad": self.payload(items=[{"concepto": self.almuerzo.pk, "cantidad": 0}]),
            "fecha_evento": self.payload(fecha_evento=str(hoy() - timedelta(days=1))),
        }
        for campo, datos in casos.items():
            with self.subTest(campo=campo):
                r = self.client.post(LISTA, datos, format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("items" if campo == "cantidad" else campo, r.data)
        self.assertFalse(Cotizacion.objects.exists())

    def test_cambiar_precio_del_concepto_no_cambia_la_cotizacion(self):
        self.client.force_authenticate(user=self.admin)
        cot_id = self.client.post(LISTA, self.payload(), format="json").data["id"]

        r = self.client.patch(f"/api/conceptos/{self.almuerzo.pk}/",
                              {"precio": "99999.00", "impuesto_pct": "19.00"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        r = self.client.get(detalle(cot_id))
        almuerzo = r.data["items"][0]
        self.assertEqual([almuerzo["precio_unitario"], almuerzo["impuesto_pct"]], ["45000.00", "8.00"])
        self.assertEqual(r.data["total"], "4185500.00")

    def test_no_existe_delete(self):
        cot = self.crear_en_bd()
        self.client.force_authenticate(user=self.admin)
        r = self.client.delete(detalle(cot.pk))
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(Cotizacion.objects.filter(pk=cot.pk).exists())

    def test_detalle_inexistente_404(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get(detalle(999999)).status_code, status.HTTP_404_NOT_FOUND)


class ListadoCotizacionesTests(CotizacionBaseTest):
    def test_lista_plana_ordenada_por_fecha_con_campos_del_contrato(self):
        tarde = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=60))
        pronto = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=20))
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(LISTA)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual([c["id"] for c in r.data], [pronto.pk, tarde.pk])
        self.assertEqual(r.data[0]["cliente_nombre"], "Ana Pérez")
        self.assertEqual(r.data[0]["salon_nombre"], "Salón Barú")
        self.assertEqual(r.data[0]["total"], "2430000.00")  # 50 x 45.000 + 8 %

    def test_filtros_estado_cliente_y_fechas(self):
        dentro = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=20))
        self.crear_en_bd(fecha_evento=hoy() + timedelta(days=60))
        self.crear_en_bd(fecha_evento=hoy() + timedelta(days=21), estado="cancelado")
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(LISTA, {
            "estado": "cotizado", "cliente": self.cliente.pk,
            "desde": str(hoy() + timedelta(days=10)), "hasta": str(hoy() + timedelta(days=30)),
        })
        self.assertEqual([c["id"] for c in r.data], [dentro.pk])

    def test_filtro_con_fecha_invalida_400(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get(LISTA, {"desde": "20-11-2026"}).status_code,
                         status.HTTP_400_BAD_REQUEST)
        # Formato correcto pero fecha imposible: parse_date lanza ValueError (antes, 500).
        self.assertEqual(self.client.get(LISTA, {"hasta": "2026-13-40"}).status_code,
                         status.HTTP_400_BAD_REQUEST)

    def test_rango_de_fechas_invertido_400(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(LISTA, {"desde": str(hoy() + timedelta(days=10)), "hasta": str(hoy())})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.json()["hasta"], ["La fecha final no puede ser anterior a la inicial."])
        # El mismo día en los dos extremos es un rango válido.
        self.assertEqual(self.client.get(LISTA, {"desde": str(hoy()), "hasta": str(hoy())}).status_code,
                         status.HTTP_200_OK)

    def test_listado_no_hace_n_mas_1(self):
        for dias in range(20, 25):
            self.crear_en_bd(fecha_evento=hoy() + timedelta(days=dias))
        self.client.force_authenticate(user=self.admin)
        # cotizaciones (con joins) + items + conceptos, sin importar cuántas haya.
        # SGDE-118: el GET ya no libera bloqueos, así que no hay consultas fijas de más.
        with self.assertNumQueries(3):
            self.client.get(LISTA)


class VigenciaTests(CotizacionBaseTest):
    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def test_vigencia_por_defecto_hoy_mas_15_dias(self):
        datos = self.payload()
        del datos["validez_oferta"]
        r = self.client.post(LISTA, datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(r.data["validez_oferta"], str(hoy() + timedelta(days=15)))

    def test_vigencia_por_defecto_no_pasa_de_la_fecha_del_evento(self):
        datos = self.payload(fecha_evento=str(hoy() + timedelta(days=7)))
        del datos["validez_oferta"]
        r = self.client.post(LISTA, datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(r.data["validez_oferta"], str(hoy() + timedelta(days=7)))

    def test_vigencia_al_crear_fuera_de_rango_400(self):
        for validez in (hoy() - timedelta(days=1), hoy() + timedelta(days=41)):
            with self.subTest(validez=validez):
                r = self.client.post(LISTA, self.payload(validez_oferta=str(validez)), format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("validez_oferta", r.data)

    def test_vencida_true_y_false(self):
        vigente = self.crear_en_bd(validez_oferta=hoy())
        vencida = self.crear_en_bd(validez_oferta=hoy() - timedelta(days=1))
        confirmada_vieja = self.crear_en_bd(validez_oferta=hoy() - timedelta(days=1), estado="confirmado")
        esperado = {vigente.pk: False, vencida.pk: True, confirmada_vieja.pk: False}
        for pk, valor in esperado.items():
            with self.subTest(pk=pk):
                self.assertIs(self.client.get(detalle(pk)).data["vencida"], valor)
        self.assertEqual({c["id"]: c["vencida"] for c in self.client.get(LISTA).data}, esperado)

    def test_patch_cambia_la_vigencia_aunque_este_vencida(self):
        cot = self.crear_en_bd(validez_oferta=hoy() - timedelta(days=3))
        nueva = str(hoy() + timedelta(days=10))
        r = self.client.patch(detalle(cot.pk), {"validez_oferta": nueva}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["validez_oferta"], nueva)
        self.assertIs(r.data["vencida"], False)
        self.assertIn("items", r.data)  # responde el detalle completo

    def test_patch_con_fecha_invalida_400(self):
        cot = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=30))
        for validez in (hoy() - timedelta(days=1), hoy() + timedelta(days=31)):
            with self.subTest(validez=validez):
                r = self.client.patch(detalle(cot.pk), {"validez_oferta": str(validez)}, format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("validez_oferta", r.data)

    def test_patch_con_otros_campos_400_y_no_cambia_nada(self):
        cot = self.crear_en_bd()
        r = self.client.patch(detalle(cot.pk), {
            "validez_oferta": str(hoy() + timedelta(days=2)), "cantidad_personas": 5, "estado": "confirmado",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(r.data), {"cantidad_personas", "estado"})
        cot.refresh_from_db()
        self.assertEqual((cot.estado, cot.cantidad_personas), ("cotizado", 50))

    def test_patch_409_si_no_esta_cotizada(self):
        for estado in ("confirmado", "cancelado"):
            cot = self.crear_en_bd(estado=estado, fecha_evento=hoy() + timedelta(days=50 + len(estado)))
            with self.subTest(estado=estado):
                r = self.client.patch(detalle(cot.pk), {"validez_oferta": str(hoy())}, format="json")
                self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
                self.assertIn("detail", r.data)

    def test_no_existe_put(self):
        cot = self.crear_en_bd()
        r = self.client.put(detalle(cot.pk), {"validez_oferta": str(hoy())}, format="json")
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


def aceptacion(pk):
    return f"{detalle(pk)}aceptacion/"


class AceptacionTests(CotizacionBaseTest):
    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def test_sin_token_401_y_otros_roles_403(self):
        cot = self.crear_en_bd()
        datos = {"tipo": "efectivo", "monto": "1000.00"}
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(aceptacion(cot.pk), datos, format="json").status_code, 401)
        for usuario in (self.cliente_user, self.proveedor_user):
            self.client.force_authenticate(user=usuario)
            with self.subTest(rol=usuario.rol.codigo):
                self.assertEqual(self.client.post(aceptacion(cot.pk), datos, format="json").status_code, 403)
        cot.refresh_from_db()
        self.assertEqual(cot.estado, "cotizado")

    def test_registra_garantia_y_confirma(self):
        cot = self.crear_en_bd()
        r = self.client.post(aceptacion(cot.pk), {"tipo": "transferencia", "monto": "1000000"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["estado"], "confirmado")
        self.assertIs(r.data["vencida"], False)
        garantia = r.data["garantia"]
        self.assertEqual(
            (garantia["tipo"], garantia["monto"], garantia["registrada_por"]),
            ("transferencia", "1000000.00", "admin@test.com"),
        )
        self.assertIsNotNone(garantia["registrada_en"])

        cot.refresh_from_db()
        self.assertEqual(cot.estado, "confirmado")
        self.assertEqual(cot.garantia_monto, Decimal("1000000.00"))
        self.assertEqual(cot.garantia_registrada_por, self.admin)
        self.assertIsNotNone(cot.garantia_registrada_en)

    def test_detalle_sin_aceptacion_tiene_garantia_null(self):
        cot = self.crear_en_bd()
        self.assertIsNone(self.client.get(detalle(cot.pk)).data["garantia"])

    def test_vencida_409(self):
        cot = self.crear_en_bd(validez_oferta=hoy() - timedelta(days=1))
        r = self.client.post(aceptacion(cot.pk), {"tipo": "efectivo", "monto": "500"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(r.data["detail"], "La cotización está vencida.")
        cot.refresh_from_db()
        self.assertEqual((cot.estado, cot.garantia_tipo), ("cotizado", ""))

    def test_cancelada_o_ya_confirmada_409(self):
        for estado in ("cancelado", "confirmado"):
            cot = self.crear_en_bd(estado=estado, fecha_evento=hoy() + timedelta(days=50 + len(estado)))
            with self.subTest(estado=estado):
                r = self.client.post(aceptacion(cot.pk), {"tipo": "efectivo", "monto": "500"}, format="json")
                self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)

    def test_tipo_invalido_400(self):
        cot = self.crear_en_bd()
        r = self.client.post(aceptacion(cot.pk), {"tipo": "cheque", "monto": "500"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tipo", r.data)

    def test_monto_cero_o_negativo_400(self):
        cot = self.crear_en_bd()
        for monto in ("0", "-10"):
            with self.subTest(monto=monto):
                r = self.client.post(aceptacion(cot.pk), {"tipo": "efectivo", "monto": monto}, format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.data["monto"], ["El monto debe ser mayor que 0."])
        cot.refresh_from_db()
        self.assertEqual(cot.estado, "cotizado")

    # Garantía mínima (2026-10-27). crear_en_bd: 50 almuerzos de 45.000 + 8% = total 2.430.000.

    def test_con_5_dias_o_mas_basta_el_30_por_ciento(self):
        for dias in (5, 30):
            cot = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=dias), validez_oferta=hoy())
            with self.subTest(dias=dias):
                r = self.client.post(aceptacion(cot.pk), {"tipo": "efectivo", "monto": "728999.99"}, format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.data["monto"], ["La garantía mínima es $ 729.000 (30% del total)."])
                r = self.client.post(aceptacion(cot.pk), {"tipo": "efectivo", "monto": "729000"}, format="json")
                self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)

    def test_con_menos_de_5_dias_se_paga_el_100_por_ciento(self):
        for dias in (0, 4):
            cot = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=dias), validez_oferta=hoy())
            with self.subTest(dias=dias):
                r = self.client.post(aceptacion(cot.pk), {"tipo": "efectivo", "monto": "2429999"}, format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.data["monto"], ["La garantía mínima es $ 2.430.000 (100% del total)."])
                cot.refresh_from_db()
                self.assertEqual(cot.estado, "cotizado")
                r = self.client.post(aceptacion(cot.pk), {"tipo": "efectivo", "monto": "2430000"}, format="json")
                self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)

    def test_no_puede_superar_el_total(self):
        cot = self.crear_en_bd()
        r = self.client.post(aceptacion(cot.pk), {"tipo": "efectivo", "monto": "2430000.01"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["monto"], ["La garantía no puede superar el total ($ 2.430.000)."])

    def test_el_detalle_trae_la_garantia_minima_mientras_se_puede_aceptar(self):
        cot = self.crear_en_bd()
        self.assertEqual(
            self.client.get(detalle(cot.pk)).data["garantia_minima"], {"porcentaje": "30", "monto": "729000.00"}
        )
        pronto = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=3), validez_oferta=hoy())
        self.assertEqual(
            self.client.get(detalle(pronto.pk)).data["garantia_minima"], {"porcentaje": "100", "monto": "2430000.00"}
        )
        self.client.post(aceptacion(cot.pk), {"tipo": "efectivo", "monto": "729000"}, format="json")
        self.assertIsNone(self.client.get(detalle(cot.pk)).data["garantia_minima"])

    def test_salon_ya_confirmado_esa_fecha_409(self):
        fecha = hoy() + timedelta(days=30)
        primera = self.crear_en_bd(fecha_evento=fecha)
        segunda = self.crear_en_bd(fecha_evento=fecha)
        datos = {"tipo": "tarjeta", "monto": "1000000"}
        self.assertEqual(self.client.post(aceptacion(primera.pk), datos, format="json").status_code, 200)

        r = self.client.post(aceptacion(segunda.pk), datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(r.data["detail"], "El salón ya está confirmado para esa fecha.")
        segunda.refresh_from_db()
        self.assertEqual((segunda.estado, segunda.garantia_tipo), ("cotizado", ""))

    def test_cotizacion_inexistente_404(self):
        r = self.client.post(aceptacion(999999), {"tipo": "efectivo", "monto": "500"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)


class CalendarioPermisosTests(CotizacionBaseTest):
    """Solo GET: por eso no va en ENDPOINTS_ADMIN (allí el POST del admin espera 400)."""

    URL = "/api/calendario/"

    def test_sin_token_401(self):
        self.assertEqual(self.client.get(self.URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cliente_y_proveedor_reciben_403(self):
        for usuario in (self.cliente_user, self.proveedor_user):
            self.client.force_authenticate(user=usuario)
            with self.subTest(rol=usuario.rol.codigo):
                self.assertEqual(self.client.get(self.URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_administrador_recibe_200(self):
        cot = self.crear_en_bd()
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual([c["id"] for c in r.data], [cot.pk])


class CalendarioCamposTests(CotizacionBaseTest):
    """SGDE-89: el Inicio arma la agenda solo con /calendario/, sin cruzar con /cotizaciones/."""

    URL = "/api/calendario/"

    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def por_id(self, respuesta):
        return {c["id"]: c for c in respuesta.data}

    def test_vencida_true_si_sigue_cotizada_y_paso_su_vigencia(self):
        vencida = self.crear_en_bd(validez_oferta=hoy() - timedelta(days=1))
        # Confirmada con la vigencia ya pasada: no cuenta como vencida.
        confirmada = self.crear_en_bd(validez_oferta=hoy() - timedelta(days=1), estado="confirmado")
        filas = self.por_id(self.client.get(self.URL))
        self.assertIs(filas[vencida.pk]["vencida"], True)
        self.assertIs(filas[confirmada.pk]["vencida"], False)

    def test_trae_validez_oferta_y_montaje(self):
        cot = self.crear_en_bd(validez_oferta=hoy() + timedelta(days=7))
        fila = self.por_id(self.client.get(self.URL))[cot.pk]
        self.assertEqual(fila["validez_oferta"], str(hoy() + timedelta(days=7)))
        self.assertEqual(fila["montaje"], self.montaje.pk)
        self.assertEqual(fila["montaje_nombre"], "Auditorio Test")

    def test_trae_bloqueo_hasta_para_el_rack(self):
        # SGDE-40: el Rack muestra hasta cuándo está bloqueado un salón.
        libre = self.crear_en_bd()
        bloqueada = self.crear_en_bd(estado="bloqueado", fecha_evento=hoy() + timedelta(days=31))
        hasta = timezone.now() + timedelta(days=1)
        bloqueada.bloqueo_hasta = hasta
        bloqueada.save()
        filas = self.por_id(self.client.get(self.URL))
        self.assertIsNone(filas[libre.pk]["bloqueo_hasta"])
        self.assertEqual(filas[bloqueada.pk]["bloqueo_hasta"], serializers.DateTimeField().to_representation(hasta))

    def crear_con_relaciones_propias(self, n):
        """Cotización con cliente, salón y montaje propios: si vuelve el N+1, sube el conteo."""
        cliente = Cliente.objects.create(
            tipo="natural", nombre=f"Cliente {n}", identificacion=f"9000{n}", correo=f"c{n}@test.com"
        )
        salon = Salon.objects.create(sitio=self.sitio, nombre=f"Salón {n}")
        montaje = Montaje.objects.create(codigo=f"test_montaje_{n}", nombre=f"Montaje {n}")
        return Cotizacion.objects.create(
            sitio=self.sitio, cliente=cliente, usuario=self.admin, salon=salon, montaje=montaje,
            cantidad_personas=10, fecha_evento=hoy() + timedelta(days=30),
            validez_oferta=hoy() + timedelta(days=5),
        )

    def test_mismas_consultas_con_1_que_con_5_cotizaciones(self):
        self.crear_con_relaciones_propias(1)
        with CaptureQueriesContext(connection) as con_una:
            self.assertEqual(len(self.client.get(self.URL).data), 1)

        for n in range(2, 6):
            self.crear_con_relaciones_propias(n)
        with self.assertNumQueries(len(con_una)):
            r = self.client.get(self.URL)
        self.assertEqual(len(r.data), 5)
        self.assertEqual(len({c["montaje_nombre"] for c in r.data}), 5)


class CalendarioFiltrosTests(CotizacionBaseTest):
    """SGDE-14: ?salon, ?desde y ?hasta se validan; antes un valor mal formado daba 500."""

    URL = "/api/calendario/"

    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def test_valores_invalidos_dan_400_con_el_campo(self):
        for params, campo in (
            ({"salon": "abc"}, "salon"),
            ({"desde": "abc"}, "desde"),
            ({"hasta": "2026-13-40"}, "hasta"),
            ({"desde": str(hoy() + timedelta(days=10)), "hasta": str(hoy())}, "hasta"),
        ):
            with self.subTest(params=params):
                r = self.client.get(self.URL, params)
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(campo, r.json())

    def test_filtros_validos_siguen_funcionando(self):
        otro_salon = Salon.objects.create(sitio=self.sitio, nombre="Salón Tierra Bomba")
        dentro = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=20))
        self.crear_en_bd(fecha_evento=hoy() + timedelta(days=60))
        fuera_de_salon = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=20))
        fuera_de_salon.salon = otro_salon
        fuera_de_salon.save()
        r = self.client.get(self.URL, {
            "salon": self.salon.pk, "desde": str(hoy() + timedelta(days=20)), "hasta": str(hoy() + timedelta(days=20)),
        })
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual([c["id"] for c in r.data], [dentro.pk])


class ListadoCamposSGDE89Tests(CotizacionBaseTest):
    """SGDE-89: fechas de creación, confirmación y bloqueo, montaje y garantía en el listado."""

    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def fila(self, cot):
        return next(c for c in self.client.get(LISTA).data if c["id"] == cot.pk)

    def test_confirmado_en_y_garantia_null_antes_de_la_aceptacion(self):
        fila = self.fila(self.crear_en_bd())
        self.assertIsNone(fila["confirmado_en"])
        self.assertIsNone(fila["garantia"])

    def test_confirmado_en_y_garantia_despues_de_la_aceptacion(self):
        cot = self.crear_en_bd()
        r = self.client.post(aceptacion(cot.pk), {"tipo": "efectivo", "monto": "800000"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)

        fila = self.fila(cot)
        self.assertIsNotNone(fila["confirmado_en"])
        self.assertEqual(fila["confirmado_en"], r.data["confirmado_en"])
        self.assertEqual((fila["garantia"]["tipo"], fila["garantia"]["monto"]), ("efectivo", "800000.00"))
        # Mismo formato que el detalle: una sola función arma la garantía.
        self.assertEqual(fila["garantia"], r.data["garantia"])

    def test_trae_creado_en_bloqueo_hasta_y_montaje_nombre(self):
        cot = self.crear_en_bd()
        Cotizacion.objects.filter(pk=cot.pk).update(bloqueo_hasta=timezone.now() + timedelta(days=2))

        fila = self.fila(cot)
        self.assertIsNotNone(fila["creado_en"])
        self.assertIsNotNone(fila["bloqueo_hasta"])
        self.assertEqual(fila["montaje_nombre"], "Auditorio Test")

    def test_bloqueo_hasta_null_si_no_hay_bloqueo(self):
        self.assertIsNone(self.fila(self.crear_en_bd())["bloqueo_hasta"])


class DetalleCamposSGDE89Tests(CotizacionBaseTest):
    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def test_trae_bloqueo_hasta_y_confirmado_en(self):
        cot = self.crear_en_bd()
        data = self.client.get(detalle(cot.pk)).data
        self.assertIn("bloqueo_hasta", data)
        self.assertIsNone(data["confirmado_en"])

        self.client.post(aceptacion(cot.pk), {"tipo": "tarjeta", "monto": "1000000"}, format="json")
        data = self.client.get(detalle(cot.pk)).data
        self.assertIsNotNone(data["confirmado_en"])
        self.assertEqual(data["confirmado_en"], data["garantia"]["registrada_en"])


def bloqueo(pk):
    return f"{detalle(pk)}bloqueo/"


def en(dias, hora=12):
    """Fecha y hora local (Colombia) a `dias` de hoy, en ISO para el payload."""
    momento = timezone.localtime().replace(hour=hora, minute=0, second=0, microsecond=0) + timedelta(days=dias)
    return momento.isoformat()


class BloqueoTests(CotizacionBaseTest):
    """SGDE-40/60/15: bloquear y liberar el salón y la fecha de una cotización."""

    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.fecha = hoy() + timedelta(days=30)

    def bloquear(self, pk, hasta=None):
        return self.client.post(bloqueo(pk), {"bloqueo_hasta": hasta or en(2)}, format="json")

    def bloqueada_en_bd(self, hasta, fecha_evento=None):
        cot = self.crear_en_bd(fecha_evento=fecha_evento or self.fecha, estado="bloqueado")
        cot.bloqueo_hasta = hasta
        cot.save()
        return cot

    def test_bloquea_y_responde_con_el_detalle(self):
        cot = self.crear_en_bd(fecha_evento=self.fecha)
        r = self.bloquear(cot.pk, en(2))
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["estado"], "bloqueado")
        self.assertIsNotNone(r.data["bloqueo_hasta"])
        cot.refresh_from_db()
        self.assertEqual(cot.estado, "bloqueado")

    def test_se_puede_bloquear_hasta_el_mismo_dia_del_evento(self):
        cot = self.crear_en_bd(fecha_evento=self.fecha)
        self.assertEqual(self.bloquear(cot.pk, en(30, hora=23)).status_code, status.HTTP_200_OK)

    def test_desde_un_estado_que_no_es_cotizado_da_409(self):
        for i, estado in enumerate(("bloqueado", "confirmado", "cancelado")):
            cot = self.crear_en_bd(fecha_evento=self.fecha + timedelta(days=i), estado=estado)
            if estado == "bloqueado":
                cot.bloqueo_hasta = timezone.now() + timedelta(days=1)
                cot.save()
            with self.subTest(estado=estado):
                r = self.bloquear(cot.pk)
                self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
                self.assertIn("Solo se puede bloquear una cotización cotizada", r.data["detail"])

    def test_una_cotizada_vencida_da_409(self):
        cot = self.crear_en_bd(fecha_evento=self.fecha, validez_oferta=hoy() - timedelta(days=1))
        r = self.bloquear(cot.pk)
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("vencida", r.data["detail"])

    def test_fecha_pasada_o_despues_del_evento_da_400(self):
        cot = self.crear_en_bd(fecha_evento=self.fecha)
        for hasta, mensaje in (
            (en(-1), "Debe ser posterior al momento actual."),
            (en(31), "No puede ser posterior al día del evento."),
        ):
            with self.subTest(hasta=hasta):
                r = self.bloquear(cot.pk, hasta)
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.data["bloqueo_hasta"], [mensaje])
        r = self.client.post(bloqueo(cot.pk), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        cot.refresh_from_db()
        self.assertEqual(cot.estado, "cotizado")

    def test_otra_cotizacion_con_bloqueo_vigente_da_409_y_dice_hasta_cuando(self):
        self.bloqueada_en_bd(timezone.now() + timedelta(days=3))
        cot = self.crear_en_bd(fecha_evento=self.fecha)
        r = self.bloquear(cot.pk)
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("bloqueado para esa fecha por otra cotización hasta", r.data["detail"])

    def test_salon_confirmado_esa_fecha_da_409(self):
        self.crear_en_bd(fecha_evento=self.fecha, estado="confirmado")
        cot = self.crear_en_bd(fecha_evento=self.fecha)
        r = self.bloquear(cot.pk)
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(r.data["detail"], "El salón ya está confirmado para esa fecha.")

    def test_otro_dia_o_un_bloqueo_vencido_no_estorban(self):
        self.bloqueada_en_bd(timezone.now() + timedelta(days=3), fecha_evento=self.fecha + timedelta(days=1))
        vencido = self.bloqueada_en_bd(timezone.now() - timedelta(minutes=1))
        cot = self.crear_en_bd(fecha_evento=self.fecha)
        self.assertEqual(self.bloquear(cot.pk).status_code, status.HTTP_200_OK)
        vencido.refresh_from_db()
        self.assertEqual((vencido.estado, vencido.bloqueo_hasta), ("cotizado", None))

    def test_liberar_a_mano(self):
        cot = self.bloqueada_en_bd(timezone.now() + timedelta(days=1))
        r = self.client.delete(bloqueo(cot.pk))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual((r.data["estado"], r.data["bloqueo_hasta"]), ("cotizado", None))

    def test_liberar_una_que_no_esta_bloqueada_da_409(self):
        cot = self.crear_en_bd(fecha_evento=self.fecha)
        r = self.client.delete(bloqueo(cot.pk))
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(r.data["detail"], "La cotización no está bloqueada; está cotizada.")

    def test_inexistente_404(self):
        self.assertEqual(self.bloquear(999999).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(bloqueo(999999)).status_code, status.HTTP_404_NOT_FOUND)


class LiberacionAutomaticaTests(CotizacionBaseTest):
    """SGDE-118: un GET no escribe. El bloqueo vencido se ve como cotizado y se libera con una acción o con el comando."""

   
    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.vencido = self.crear_en_bd(estado="bloqueado")
        self.vencido.bloqueo_hasta = timezone.now() - timedelta(minutes=1)
        self.vencido.save()
        self.vigente = self.crear_en_bd(estado="bloqueado", fecha_evento=hoy() + timedelta(days=31))
        self.vigente.bloqueo_hasta = timezone.now() + timedelta(days=1)
        self.vigente.save()

    def assertLiberado(self):
        self.vencido.refresh_from_db()
        self.vigente.refresh_from_db()
        self.assertEqual((self.vencido.estado, self.vencido.bloqueo_hasta), ("cotizado", None))
        self.assertEqual(self.vigente.estado, "bloqueado")

    def assertSinEscribir(self):
        # Un GET no cambia la base: el vencido sigue bloqueado y sin movimiento hasta que lo libere una acción o el comando.
        self.vencido.refresh_from_db()
        self.assertEqual(self.vencido.estado, "bloqueado")
        self.assertIsNotNone(self.vencido.bloqueo_hasta)
        self.assertFalse(MovimientoCotizacion.objects.filter(cotizacion=self.vencido).exists())    

    def test_al_listar(self):
        filas = {c["id"]: c for c in self.client.get(LISTA).data}
        self.assertEqual(filas[self.vencido.pk]["estado"], "cotizado")
        self.assertIsNone(filas[self.vencido.pk]["bloqueo_hasta"])
        self.assertSinEscribir()

    def test_al_ver_el_detalle(self):
        self.assertEqual(self.client.get(detalle(self.vencido.pk)).data["estado"], "cotizado")
        self.assertSinEscribir()

    def test_al_ver_el_calendario(self):
        filas = {c["id"]: c for c in self.client.get("/api/calendario/").data}
        self.assertEqual(filas[self.vencido.pk]["estado"], "cotizado")
        self.assertEqual(filas[self.vigente.pk]["estado"], "bloqueado")
        self.assertSinEscribir()

    def test_con_el_comando(self):
        salida = StringIO()
        call_command("liberar_bloqueos", stdout=salida)
        self.assertIn("Bloqueos vencidos liberados: 1", salida.getvalue())
        self.assertLiberado()


class AceptarConBloqueoTests(CotizacionBaseTest):
    """La aceptación (SGDE-20) acepta una bloqueada y respeta el bloqueo de otra cotización."""

    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.datos = {"tipo": "transferencia", "monto": "1000000"}

    def bloqueada(self, fecha_evento=None, validez_oferta=None):
        cot = self.crear_en_bd(estado="bloqueado", fecha_evento=fecha_evento, validez_oferta=validez_oferta)
        cot.bloqueo_hasta = timezone.now() + timedelta(days=1)
        cot.save()
        return cot

    def test_acepta_una_bloqueada_y_quita_el_bloqueo(self):
        cot = self.bloqueada()
        r = self.client.post(aceptacion(cot.pk), self.datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual((r.data["estado"], r.data["bloqueo_hasta"]), ("confirmado", None))

    def test_acepta_una_bloqueada_aunque_su_vigencia_haya_pasado(self):
        cot = self.bloqueada(validez_oferta=hoy() - timedelta(days=1))
        self.assertEqual(self.client.post(aceptacion(cot.pk), self.datos, format="json").status_code,
                         status.HTTP_200_OK)

    def test_otra_cotizacion_con_bloqueo_vigente_da_409_y_dice_hasta_cuando(self):
        fecha = hoy() + timedelta(days=30)
        self.bloqueada(fecha_evento=fecha)
        otra = self.crear_en_bd(fecha_evento=fecha)
        r = self.client.post(aceptacion(otra.pk), self.datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("bloqueado para esa fecha por otra cotización hasta", r.data["detail"])
        otra.refresh_from_db()
        self.assertEqual(otra.estado, "cotizado")


def cancelacion(pk):
    return f"{detalle(pk)}cancelacion/"


class CancelacionTests(CotizacionBaseTest):
    """SGDE-61: cancelar un evento confirmado con penalización."""

    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.fecha = hoy() + timedelta(days=30)
        self.datos = {"penalizacion_pct": "20", "motivo": "El cliente pospuso el congreso."}

    def confirmada(self):
        cot = self.crear_en_bd(fecha_evento=self.fecha)
        r = self.client.post(aceptacion(cot.pk), {"tipo": "transferencia", "monto": "1000000"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        return cot

    def test_cancela_una_confirmada_y_registra_todo(self):
        cot = self.confirmada()
        r = self.client.post(cancelacion(cot.pk), self.datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["estado"], "cancelado")
        self.assertEqual(r.data["penalizacion_pct"], "20.00")
        self.assertEqual(r.data["motivo_cancelacion"], "El cliente pospuso el congreso.")
        self.assertEqual(r.data["cancelado_por"], "admin@test.com")
        self.assertIsNotNone(r.data["cancelado_en"])
        # Total: 50 × 45.000 + 8 % = 2.430.000; el 20 % retenido = 486.000.
        self.assertEqual(r.data["monto_retenido"], "486000.00")
        cot.refresh_from_db()
        self.assertEqual((cot.estado, cot.cancelado_por), ("cancelado", self.admin))

    def test_el_listado_trae_los_campos_de_la_cancelacion(self):
        cot = self.confirmada()
        self.client.post(cancelacion(cot.pk), self.datos, format="json")
        fila = {c["id"]: c for c in self.client.get(LISTA).data}[cot.pk]
        self.assertEqual(
            (fila["estado"], fila["penalizacion_pct"], fila["monto_retenido"], fila["cancelado_por"]),
            ("cancelado", "20.00", "486000.00", "admin@test.com"),
        )

    def test_una_no_cancelada_trae_los_campos_en_null(self):
        data = self.client.get(detalle(self.crear_en_bd().pk)).data
        self.assertEqual(
            [data[campo] for campo in ("cancelado_en", "cancelado_por", "penalizacion_pct", "monto_retenido")],
            [None, None, None, None],
        )
        self.assertEqual(data["motivo_cancelacion"], "")

    def test_el_monto_retenido_se_redondea_como_los_totales(self):
        cot = self.confirmada()
        r = self.client.post(cancelacion(cot.pk), {"penalizacion_pct": "33.33", "motivo": "X"}, format="json")
        # 2.430.000 × 33,33 % = 809.919,00
        self.assertEqual(r.data["monto_retenido"], "809919.00")

    def test_cotizada_bloqueada_o_cancelada_da_409(self):
        bloqueada = self.crear_en_bd(fecha_evento=self.fecha + timedelta(days=1), estado="bloqueado")
        bloqueada.bloqueo_hasta = timezone.now() + timedelta(days=1)
        bloqueada.save()
        casos = {
            "cotizada": self.crear_en_bd(fecha_evento=self.fecha + timedelta(days=2)),
            "bloqueada": bloqueada,
            "cancelada": self.crear_en_bd(fecha_evento=self.fecha + timedelta(days=3), estado="cancelado"),
        }
        for nombre, cot in casos.items():
            with self.subTest(estado=nombre):
                r = self.client.post(cancelacion(cot.pk), self.datos, format="json")
                self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
                self.assertEqual(
                    r.data["detail"],
                    f"Solo se puede cancelar un evento confirmado; esta cotización está {nombre}.",
                )

    def test_penalizacion_fuera_de_rango_o_motivo_vacio_da_400(self):
        cot = self.confirmada()
        for datos, campo in (
            ({"penalizacion_pct": "-1", "motivo": "X"}, "penalizacion_pct"),
            ({"penalizacion_pct": "100.01", "motivo": "X"}, "penalizacion_pct"),
            ({"motivo": "X"}, "penalizacion_pct"),
            ({"penalizacion_pct": "10", "motivo": "   "}, "motivo"),
            ({"penalizacion_pct": "10"}, "motivo"),
        ):
            with self.subTest(datos=datos):
                r = self.client.post(cancelacion(cot.pk), datos, format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(campo, r.data)
        cot.refresh_from_db()
        self.assertEqual(cot.estado, "confirmado")

    def test_los_extremos_0_y_100_son_validos(self):
        for pct in ("0", "100"):
            with self.subTest(pct=pct):
                cot = self.confirmada()
                r = self.client.post(cancelacion(cot.pk), {"penalizacion_pct": pct, "motivo": "X"}, format="json")
                self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_despues_de_cancelar_otra_cotizacion_puede_confirmarse_ese_dia(self):
        cot = self.confirmada()
        otra = self.crear_en_bd(fecha_evento=self.fecha)
        datos = {"tipo": "efectivo", "monto": "1000000"}
        self.assertEqual(self.client.post(aceptacion(otra.pk), datos, format="json").status_code,
                         status.HTTP_409_CONFLICT)
        self.client.post(cancelacion(cot.pk), self.datos, format="json")
        self.assertEqual(self.client.post(aceptacion(otra.pk), datos, format="json").status_code,
                         status.HTTP_200_OK)

    def test_inexistente_404(self):
        self.assertEqual(self.client.post(cancelacion(999999), self.datos, format="json").status_code,
                         status.HTTP_404_NOT_FOUND)


def movimientos(pk):
    return f"{detalle(pk)}movimientos/"


class MovimientosTests(CotizacionBaseTest):
    """SGDE-62: cada acción deja su movimiento con el usuario correcto, en la misma transacción."""

    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.otro_admin = crear_usuario("otro_admin@test.com", "administrador")
        self.otro_admin.sitios.add(self.sitio)

    def tipos_y_usuarios(self, cot):
        return [(m["tipo"], m["usuario"]) for m in self.client.get(movimientos(cot.pk)).data]

    def test_el_ciclo_completo_deja_un_movimiento_por_accion(self):
        r = self.client.post(LISTA, self.payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        pk = r.data["id"]
        nueva = str(hoy() + timedelta(days=12))
        self.assertEqual(self.client.patch(detalle(pk), {"validez_oferta": nueva}, format="json").status_code, 200)
        self.assertEqual(self.client.post(bloqueo(pk), {"bloqueo_hasta": en(2)}, format="json").status_code, 200)
        self.assertEqual(self.client.delete(bloqueo(pk)).status_code, 200)

        # Otro administrador confirma y cancela: el movimiento lleva su usuario, no el del creador.
        self.client.force_authenticate(user=self.otro_admin)
        datos = {"tipo": "efectivo", "monto": "2000000"}
        self.assertEqual(self.client.post(aceptacion(pk), datos, format="json").status_code, 200)
        cancelar = {"penalizacion_pct": "10", "motivo": "Lluvia"}
        self.assertEqual(self.client.post(cancelacion(pk), cancelar, format="json").status_code, 200)

        r = self.client.get(movimientos(pk))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual([(m["tipo"], m["usuario"]) for m in r.data], [
            ("creada", "admin@test.com"),
            ("vigencia", "admin@test.com"),
            ("bloqueada", "admin@test.com"),
            ("liberada", "admin@test.com"),
            ("confirmada", "otro_admin@test.com"),
            ("cancelada", "otro_admin@test.com"),
        ])
        self.assertEqual(set(r.data[0]), {"id", "tipo", "usuario", "fecha", "detalle"})
        self.assertIn(nueva[8:10], r.data[1]["detalle"])
        self.assertEqual(r.data[5]["detalle"], "Penalización 10.00 %. Motivo: Lluvia")

    def test_la_liberacion_automatica_la_hace_el_sistema(self):
        cot = self.crear_en_bd(estado="bloqueado")
        cot.bloqueo_hasta = timezone.now() - timedelta(minutes=1)
        cot.save()
        self.client.get(LISTA)
        # SGDE-118: leer no libera ni deja movimiento; lo deja el comando (o la siguiente acción).
        self.assertFalse(MovimientoCotizacion.objects.filter(cotizacion=cot).exists())
        call_command("liberar_bloqueos", stdout=StringIO())
        movimiento = MovimientoCotizacion.objects.get(cotizacion=cot)
        self.assertEqual((movimiento.tipo, movimiento.usuario), ("liberada", None))
        self.assertEqual(self.tipos_y_usuarios(cot), [("liberada", "sistema")])

    def test_una_accion_que_falla_no_deja_movimiento(self):
        cot = self.crear_en_bd()
        r = self.client.post(cancelacion(cot.pk), {"penalizacion_pct": "10", "motivo": "X"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        r = self.client.post(bloqueo(cot.pk), {"bloqueo_hasta": en(60)}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(MovimientoCotizacion.objects.filter(cotizacion=cot).exists())

    def test_inexistente_404(self):
        self.assertEqual(self.client.get(movimientos(999999)).status_code, status.HTTP_404_NOT_FOUND)


class HistoricoPorSalonTests(CotizacionBaseTest):
    """SGDE-62: el histórico de un salón es el listado con ?salon=."""

    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def test_filtra_por_salon_con_todos_los_estados(self):
        otro = Salon.objects.create(sitio=self.sitio, nombre="Salón Tierra Bomba")
        cancelada = self.crear_en_bd(estado="cancelado")
        confirmada = self.crear_en_bd(estado="confirmado", fecha_evento=hoy() + timedelta(days=31))
        ajena = self.crear_en_bd()
        ajena.salon = otro
        ajena.save()
        r = self.client.get(LISTA, {"salon": self.salon.pk})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual({c["id"] for c in r.data}, {cancelada.pk, confirmada.pk})

    def test_salon_no_numerico_400(self):
        r = self.client.get(LISTA, {"salon": "abc"})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.json()["salon"], ["Debe ser el id numérico del salón."])


class MigracionMovimientosExistentesTests(TransactionTestCase):
    """SGDE-62: la 0006 crea "creada" y "confirmada" de lo viejo con su fecha original, no la de hoy."""

    serialized_rollback = True
    antes = [("cotizaciones", "0005_movimientos_de_cotizacion")]
    despues = [("cotizaciones", "0006_movimientos_de_cotizaciones_existentes")]

    def migrar(self, destino):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(destino)
        # Modelos históricos: cotizaciones en `destino` y las demás apps al día (si no,
        # Cliente sale en la versión que conocía la 0001 de cotizaciones).
        otras = [nodo for nodo in executor.loader.graph.leaf_nodes() if nodo[0] != "cotizaciones"]
        return executor.loader.project_state(otras + destino).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    def test_crea_los_movimientos_con_la_fecha_original(self):
        apps = self.migrar(self.antes)
        modelo = apps.get_model
        admin = modelo("usuarios", "Usuario").objects.create(
            username="viejo@test.com", rol=modelo("usuarios", "Rol").objects.get(codigo="administrador"),
        )
        sitio = modelo("sitios", "Sitio").objects.create(
            nombre="Hotel Viejo", ciudad=modelo("sitios", "Ciudad").objects.get(codigo="CTG"),
        )
        comunes = dict(
            sitio=sitio, usuario=admin, cantidad_personas=10,
            cliente=modelo("clientes", "Cliente").objects.create(tipo="natural", nombre="Ana", identificacion="1"),
            salon=modelo("salones", "Salon").objects.create(sitio=sitio, nombre="Salón Viejo"),
            montaje=modelo("salones", "Montaje").objects.create(codigo="test_viejo", nombre="Viejo"),
        )
        creado = timezone.make_aware(datetime(2026, 9, 1, 10, 30))
        confirmado = timezone.make_aware(datetime(2026, 9, 5, 16, 45))
        Cotizacion = modelo("cotizaciones", "Cotizacion")
        ids = {}
        for i, (nombre, extra) in enumerate({
            "cotizada": {"estado": "cotizado"},
            "confirmada": {"estado": "confirmado", "garantia_tipo": "efectivo", "garantia_monto": Decimal("100"),
                           "garantia_registrada_en": confirmado, "garantia_registrada_por": admin},
            "confirmada_a_mano": {"estado": "confirmado"},
            "cancelada": {"estado": "cancelado", "garantia_tipo": "efectivo", "garantia_monto": Decimal("100"),
                          "garantia_registrada_en": confirmado, "garantia_registrada_por": admin},
            "bloqueada": {"estado": "bloqueado", "bloqueo_hasta": timezone.now() + timedelta(days=1)},
        }.items()):
            cot = Cotizacion.objects.create(fecha_evento=timezone.localdate() + timedelta(days=30 + i), **comunes, **extra)
            ids[nombre] = cot.pk
        Cotizacion.objects.update(creado_en=creado)

        Movimiento = self.migrar(self.despues).get_model("cotizaciones", "MovimientoCotizacion")

        def de(nombre):
            return [(m.tipo, m.usuario_id, m.fecha) for m in Movimiento.objects.filter(cotizacion_id=ids[nombre])]

        self.assertEqual(de("cotizada"), [("creada", admin.pk, creado)])
        self.assertEqual(de("confirmada"), [("creada", admin.pk, creado), ("confirmada", admin.pk, confirmado)])
        # Sin registro de garantía (confirmada en /admin/), ni canceladas ni bloqueadas: solo "creada".
        for nombre in ("confirmada_a_mano", "cancelada", "bloqueada"):
            with self.subTest(caso=nombre):
                self.assertEqual(de(nombre), [("creada", admin.pk, creado)])


def consultas_for_update(contexto):
    """Las tablas que una petición bloqueó con SELECT ... FOR UPDATE."""
    tablas = ("salones_salonmontaje", "salones_salon", "cotizaciones_cotizacion")
    bloqueadas = set()
    for consulta in contexto.captured_queries:
        sql = consulta["sql"]
        if "FOR UPDATE" in sql:
            desde = sql.split(" FROM ", 1)[1]
            bloqueadas.update(t for t in tablas if desde.startswith(f'"{t}"'))
    return bloqueadas


class CrearConBloqueoDelMontajeTests(CotizacionBaseTest):
    """SGDE-100: crear una cotización bloquea el salón y su montaje habilitado hasta guardar."""

    def test_la_creacion_pide_el_bloqueo_y_sigue_funcionando(self):
        self.client.force_authenticate(user=self.admin)
        with CaptureQueriesContext(connection) as contexto:
            r = self.client.post(LISTA, self.payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(consultas_for_update(contexto), {"salones_salon", "salones_salonmontaje"})


class GetNoEscribeSGDE118Tests(CotizacionBaseTest):
    # SGDE-118: los GET no escriben; el estado se calcula al leer y liberan las acciones y el comando.

    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.vencida = self.crear_en_bd(estado="bloqueado")
        Cotizacion.objects.filter(pk=self.vencida.pk).update(bloqueo_hasta=timezone.now() - timedelta(hours=1))

    def escrituras(self, url):
        # Las sentencias que modifican datos durante un GET.
        with CaptureQueriesContext(connection) as consultas:
            r = self.client.get(url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        return [
            q["sql"] for q in consultas
            if q["sql"].lstrip().upper().startswith(("UPDATE", "INSERT", "DELETE"))
            or "FOR UPDATE" in q["sql"].upper()
        ]

    def test_listado_y_detalle_no_escriben(self):
        for url in (LISTA, detalle(self.vencida.pk)):
            with self.subTest(url=url):
                self.assertEqual(self.escrituras(url), [])
        self.vencida.refresh_from_db()
        self.assertEqual(self.vencida.estado, "bloqueado")
        self.assertFalse(MovimientoCotizacion.objects.filter(cotizacion=self.vencida, tipo="liberada").exists())

    def test_bloqueo_vencido_se_muestra_como_cotizado(self):
        r = self.client.get(detalle(self.vencida.pk))
        self.assertEqual(r.data["estado"], "cotizado")
        self.assertIsNone(r.data["bloqueo_hasta"])
        fila = next(c for c in self.client.get(LISTA).data if c["id"] == self.vencida.pk)
        self.assertEqual(fila["estado"], "cotizado")
        self.assertIsNone(fila["bloqueo_hasta"])

    def test_filtro_por_estado_usa_el_estado_efectivo(self):
        vigente = self.crear_en_bd(estado="bloqueado", fecha_evento=hoy() + timedelta(days=31))
        Cotizacion.objects.filter(pk=vigente.pk).update(bloqueo_hasta=timezone.now() + timedelta(hours=2))
        bloqueadas = [c["id"] for c in self.client.get(LISTA, {"estado": "bloqueado"}).data]
        cotizadas = [c["id"] for c in self.client.get(LISTA, {"estado": "cotizado"}).data]
        self.assertEqual(bloqueadas, [vigente.pk])
        self.assertEqual(cotizadas, [self.vencida.pk])

    def test_una_accion_libera_solo_los_vencidos_de_sus_sitios(self):
        ajeno = Sitio.objects.create(nombre="Hotel Ajeno", ciudad=Ciudad.objects.get(codigo="CTG"))
        salon_ajeno = Salon.objects.create(sitio=ajeno, nombre="Salón Ajeno")
        vencida_ajena = Cotizacion.objects.create(
            sitio=ajeno, cliente=self.cliente, usuario=self.admin, salon=salon_ajeno,
            montaje=self.montaje, estado="bloqueado", cantidad_personas=10,
            fecha_evento=hoy() + timedelta(days=30), bloqueo_hasta=timezone.now() - timedelta(hours=1),
        )
        otra = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=40))
        r = self.client.patch(detalle(otra.pk), {"validez_oferta": str(hoy() + timedelta(days=3))}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)

        self.vencida.refresh_from_db()
        vencida_ajena.refresh_from_db()
        self.assertEqual(self.vencida.estado, "cotizado")
        self.assertTrue(
            MovimientoCotizacion.objects.filter(cotizacion=self.vencida, tipo="liberada", usuario__isnull=True).exists()
        )
        self.assertEqual(vencida_ajena.estado, "bloqueado")  # de un sitio que el usuario no administra

    def test_activas_usa_el_estado_efectivo(self):
        # El bloqueo vencido cuenta como cotizado: activo solo si su oferta sigue vigente.
        self.assertIn(self.vencida, Cotizacion.objects.activas())
        Cotizacion.objects.filter(pk=self.vencida.pk).update(validez_oferta=hoy() - timedelta(days=1))
        self.assertNotIn(self.vencida, Cotizacion.objects.activas())
        vigente = self.crear_en_bd(estado="bloqueado", fecha_evento=hoy() + timedelta(days=31))
        Cotizacion.objects.filter(pk=vigente.pk).update(
            bloqueo_hasta=timezone.now() + timedelta(hours=2), validez_oferta=hoy() - timedelta(days=1)
        )
        self.assertIn(vigente, Cotizacion.objects.activas())

    def test_bloqueo_vencido_con_oferta_vencida_no_impide_dar_de_baja_el_salon(self):
        # Antes daba un 409 falso: activas() leía "bloqueado" de la base sin mirar bloqueo_hasta.
        Cotizacion.objects.filter(pk=self.vencida.pk).update(validez_oferta=hoy() - timedelta(days=1))
        r = self.client.patch(f"/api/salones/{self.salon.pk}/", {"activo": False}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)

    def test_historial_del_cliente_muestra_el_estado_efectivo(self):
        r = self.client.get(f"/api/clientes/{self.cliente.pk}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        fila = next(c for c in r.data["cotizaciones"] if c["id"] == self.vencida.pk)
        self.assertEqual(fila["estado"], "cotizado")

    def test_el_comando_libera_los_vencidos_de_todos_los_sitios(self):
        call_command("liberar_bloqueos")
        self.vencida.refresh_from_db()
        self.assertEqual(self.vencida.estado, "cotizado")
        self.assertIsNone(self.vencida.bloqueo_hasta)

def anulacion(pk):
    return f"{detalle(pk)}anulacion/"


def edicion(pk):
    return f"{detalle(pk)}edicion/"


class AnulacionTests(CotizacionBaseTest):
    """Anular una cotización que no se confirmó: queda cancelada, sin penalización."""

    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def test_anula_una_cotizada_sin_penalizacion_y_deja_movimiento(self):
        cot = self.crear_en_bd()
        r = self.client.post(anulacion(cot.pk), {"motivo": "El cliente eligió otra fecha."}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["estado"], "cancelado")
        self.assertIsNone(r.data["penalizacion_pct"])
        self.assertIsNone(r.data["monto_retenido"])
        self.assertEqual(r.data["motivo_cancelacion"], "El cliente eligió otra fecha.")
        self.assertEqual(r.data["cancelado_por"], "admin@test.com")
        ultimo = self.client.get(movimientos(cot.pk)).data[-1]
        self.assertEqual((ultimo["tipo"], ultimo["detalle"]), ("anulada", "Motivo: El cliente eligió otra fecha."))

    def test_anula_una_vencida_y_una_bloqueada_que_suelta_su_fecha(self):
        vencida = self.crear_en_bd(validez_oferta=hoy() - timedelta(days=1))
        self.assertEqual(self.client.post(anulacion(vencida.pk), {"motivo": "No respondió."}, format="json").status_code, 200)

        bloqueada = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=20))
        self.assertEqual(self.client.post(bloqueo(bloqueada.pk), {"bloqueo_hasta": en(2)}, format="json").status_code, 200)
        r = self.client.post(anulacion(bloqueada.pk), {"motivo": "Desistió."}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIsNone(r.data["bloqueo_hasta"])

        # La fecha quedó libre: otra cotización del mismo salón y día se puede bloquear.
        otra = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=20))
        self.assertEqual(self.client.post(bloqueo(otra.pk), {"bloqueo_hasta": en(2)}, format="json").status_code, 200)

    def test_confirmada_o_cancelada_da_409(self):
        for estado in ("confirmado", "cancelado"):
            cot = self.crear_en_bd(estado=estado, fecha_evento=hoy() + timedelta(days=60 + len(estado)))
            with self.subTest(estado=estado):
                r = self.client.post(anulacion(cot.pk), {"motivo": "x"}, format="json")
                self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)

    def test_sin_motivo_400_y_otros_roles_403(self):
        cot = self.crear_en_bd()
        r = self.client.post(anulacion(cot.pk), {"motivo": ""}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("motivo", r.data)
        self.client.force_authenticate(user=self.cliente_user)
        self.assertEqual(self.client.post(anulacion(cot.pk), {"motivo": "x"}, format="json").status_code, 403)
        cot.refresh_from_db()
        self.assertEqual(cot.estado, "cotizado")


class EdicionTests(CotizacionBaseTest):
    """Editar una cotización cotizada con el mismo cuerpo que crear."""

    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post(LISTA, self.payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.pk = r.data["id"]

    def test_cambia_fecha_personas_y_conceptos(self):
        nueva_fecha = str(hoy() + timedelta(days=45))
        datos = self.payload(
            fecha_evento=nueva_fecha, cantidad_personas=100,
            items=[{"concepto": self.almuerzo.pk, "cantidad": 100}],
        )
        r = self.client.put(edicion(self.pk), datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual((r.data["fecha_evento"], r.data["cantidad_personas"]), (nueva_fecha, 100))
        self.assertEqual([(i["concepto"], i["cantidad"]) for i in r.data["items"]], [(self.almuerzo.pk, 100)])
        self.assertEqual(r.data["total"], "4860000.00")  # 100 × 45.000 + 8 %

        ultimo = self.client.get(movimientos(self.pk)).data[-1]
        self.assertEqual(ultimo["tipo"], "editada")
        self.assertIn("personas: 80 → 100", ultimo["detalle"])
        self.assertIn("conceptos: 1", ultimo["detalle"])

    def test_los_conceptos_que_ya_estaban_conservan_su_precio(self):
        Concepto.objects.filter(pk=self.almuerzo.pk).update(precio=Decimal("99999.00"))
        Concepto.objects.filter(pk=self.video_beam.pk).update(precio=Decimal("1.00"))
        # El almuerzo ya estaba: conserva 45.000. El video beam se quita y vuelve: también estaba.
        r = self.client.put(edicion(self.pk), self.payload(), format="json")
        precios = {i["concepto"]: i["precio_unitario"] for i in r.data["items"]}
        self.assertEqual(precios, {self.almuerzo.pk: "45000.00", self.video_beam.pk: "250000.00"})

        nuevo = Concepto.objects.create(sitio=self.sitio, nombre="Coctel", precio=Decimal("12000.00"))
        datos = self.payload(items=[{"concepto": nuevo.pk, "cantidad": 2}])
        r = self.client.put(edicion(self.pk), datos, format="json")
        self.assertEqual(r.data["items"][0]["precio_unitario"], "12000.00")

    def test_valida_igual_que_crear(self):
        r = self.client.put(edicion(self.pk), self.payload(cantidad_personas=500, items=[]), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("items", r.data)
        r = self.client.put(edicion(self.pk), self.payload(cantidad_personas=500), format="json")
        self.assertIn("cantidad_personas", r.data)
        self.assertEqual(Cotizacion.objects.get(pk=self.pk).cantidad_personas, 80)

    def test_bloqueada_confirmada_o_cancelada_da_409(self):
        self.assertEqual(self.client.post(bloqueo(self.pk), {"bloqueo_hasta": en(2)}, format="json").status_code, 200)
        r = self.client.put(edicion(self.pk), self.payload(cantidad_personas=90), format="json")
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        for estado in ("confirmado", "cancelado"):
            cot = self.crear_en_bd(estado=estado, fecha_evento=hoy() + timedelta(days=70 + len(estado)))
            with self.subTest(estado=estado):
                self.assertEqual(self.client.put(edicion(cot.pk), self.payload(), format="json").status_code, 409)

    def test_una_vencida_se_edita_y_vuelve_a_quedar_vigente(self):
        Cotizacion.objects.filter(pk=self.pk).update(validez_oferta=hoy() - timedelta(days=1))
        datos = self.payload()
        del datos["validez_oferta"]
        r = self.client.put(edicion(self.pk), datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertFalse(r.data["vencida"])
        self.assertEqual(r.data["validez_oferta"], str(hoy() + timedelta(days=15)))

    def test_inexistente_404(self):
        self.assertEqual(self.client.put(edicion(999999), self.payload(), format="json").status_code, 404)


class FormatoGarantiaEnMovimientoTests(CotizacionBaseTest):
    def test_el_monto_va_en_pesos(self):
        self.client.force_authenticate(user=self.admin)
        cot = self.crear_en_bd()
        self.client.post(aceptacion(cot.pk), {"tipo": "transferencia", "monto": "1000000"}, format="json")
        self.assertEqual(
            self.client.get(movimientos(cot.pk)).data[-1]["detalle"], "Garantía: transferencia, $ 1.000.000."
        )


MIS_COTIZACIONES = "/api/mis-cotizaciones/"


class MisCotizacionesTests(CotizacionBaseTest):
    """SGDE-126: el cliente ve solo sus cotizaciones, sin datos internos y sin poder cambiarlas."""

    def setUp(self):
        Cliente.objects.filter(pk=self.cliente.pk).update(usuario=self.cliente_user)
        self.otro_cliente = Cliente.objects.create(
            tipo="natural", nombre="Luis Gómez", identificacion="1047000222", correo="luis@test.com"
        )
        self.mia = self.crear_en_bd()
        self.ajena = self.crear_en_bd(fecha_evento=hoy() + timedelta(days=31))
        Cotizacion.objects.filter(pk=self.ajena.pk).update(cliente=self.otro_cliente)
        self.client.force_authenticate(user=self.cliente_user)

    def test_sin_token_401_y_otros_roles_403_con_codigo(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(MIS_COTIZACIONES).status_code, status.HTTP_401_UNAUTHORIZED)
        for usuario in (self.admin, self.proveedor_user):
            self.client.force_authenticate(user=usuario)
            with self.subTest(rol=usuario.rol.codigo):
                r = self.client.get(MIS_COTIZACIONES)
                self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(r.data["codigo"], "no_es_cliente")

    def test_cliente_sin_vincular_403(self):
        self.client.force_authenticate(user=crear_usuario("nuevo@test.com", "cliente"))
        r = self.client.get(MIS_COTIZACIONES)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(r.data["codigo"], "cliente_sin_vincular")

    def test_la_lista_trae_solo_las_suyas(self):
        r = self.client.get(MIS_COTIZACIONES)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual([c["id"] for c in r.data], [self.mia.pk])
        self.assertEqual(r.data[0]["sitio_nombre"], "Hotel Caribe")
        self.assertEqual(r.data[0]["total"], "2430000.00")

    def test_el_detalle_de_una_ajena_da_404(self):
        self.assertEqual(self.client.get(f"{MIS_COTIZACIONES}{self.ajena.pk}/").status_code, status.HTTP_404_NOT_FOUND)
        r = self.client.get(f"{MIS_COTIZACIONES}{self.mia.pk}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data["items"]), 1)
        self.assertEqual(r.data["cliente"]["nombre"], "Ana Pérez")

    def test_no_trae_datos_internos(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(f"{detalle(self.mia.pk)}aceptacion/", {"tipo": "efectivo", "monto": "1000000"}, format="json")
        self.client.force_authenticate(user=self.cliente_user)

        fila = self.client.get(MIS_COTIZACIONES).data[0]
        datos = self.client.get(f"{MIS_COTIZACIONES}{self.mia.pk}/").data
        for respuesta in (fila, datos):
            with self.subTest(respuesta="lista" if respuesta is fila else "detalle"):
                for campo in ("creado_por", "cancelado_por", "garantia_minima"):
                    self.assertNotIn(campo, respuesta)
                self.assertEqual(respuesta["garantia"]["monto"], "1000000.00")
                self.assertNotIn("registrada_por", respuesta["garantia"])

    def test_es_solo_lectura(self):
        url = f"{MIS_COTIZACIONES}{self.mia.pk}/"
        self.assertEqual(self.client.post(MIS_COTIZACIONES, self.payload(), format="json").status_code,
                         status.HTTP_405_METHOD_NOT_ALLOWED)
        for metodo in (self.client.patch, self.client.put, self.client.delete):
            with self.subTest(metodo=metodo.__name__):
                self.assertEqual(metodo(url, {}, format="json").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        # Las rutas del administrador siguen cerradas para el cliente.
        self.assertEqual(self.client.get(detalle(self.mia.pk)).status_code, status.HTTP_403_FORBIDDEN)
        r = self.client.post(f"{detalle(self.mia.pk)}aceptacion/", {"tipo": "efectivo", "monto": "1000000"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

from datetime import timedelta
from decimal import Decimal

from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import Concepto
from apps.clientes.models import Cliente
from apps.salones.models import Montaje, Salon, SalonMontaje
from apps.sitios.models import Ciudad, Sitio
from apps.usuarios.models import Rol, Usuario

from .models import Cotizacion, CotizacionItem
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
        self.assertEqual(r.data["items"][2], {"concepto": ["El concepto no pertenece al sitio del salón."]})
        self.assertFalse(Cotizacion.objects.exists())

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

    def test_listado_no_hace_n_mas_1(self):
        for dias in range(20, 25):
            self.crear_en_bd(fecha_evento=hoy() + timedelta(days=dias))
        self.client.force_authenticate(user=self.admin)
        # cotizaciones (con joins) + items + conceptos, sin importar cuántas haya
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

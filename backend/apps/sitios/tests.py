"""Filtro multi-sitio (SGDE-90).

Escenario: dos sitios (A y B), cada uno con su salón, montaje habilitado, concepto
(con historial de precio) y cotización. Un cliente compartido cotizó en los dos.
Usuarios: un administrador por sitio, un superusuario y un administrador sin sitios.
"""
from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import Concepto, HistorialPrecioConcepto
from apps.clientes.models import Cliente
from apps.cotizaciones.models import Cotizacion, CotizacionItem
from apps.salones.models import Montaje, Salon, SalonMontaje
from apps.usuarios.models import Rol, Usuario

from .models import Ciudad, Sitio

PASSWORD = "Clave-Segura-123"


def crear_usuario(username, codigo_rol="administrador", sitios=(), superusuario=False):
    usuario = Usuario.objects.create_user(
        username=username, password=PASSWORD, rol=Rol.objects.get(codigo=codigo_rol),
        is_superuser=superusuario, is_staff=superusuario,
    )
    usuario.sitios.set(sitios)
    return usuario


def ids(respuesta):
    return {fila["id"] for fila in respuesta.json()}


class MultiSitioBaseTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ctg = Ciudad.objects.get(codigo="CTG")
        cls.montaje = Montaje.objects.create(codigo="test_auditorio", nombre="Auditorio Test")
        cls.cliente = Cliente.objects.create(tipo="natural", nombre="Ana Pérez", identificacion="1047000111")
        cls.a = cls.crear_sitio("Hotel A")
        cls.b = cls.crear_sitio("Finca B")

        cls.admin_a = crear_usuario("admin_a@test.com", sitios=[cls.a["sitio"]])
        cls.admin_b = crear_usuario("admin_b@test.com", sitios=[cls.b["sitio"]])
        cls.superusuario = crear_usuario("super@test.com", superusuario=True)
        cls.admin_sin_sitios = crear_usuario("sin_sitios@test.com")

        for datos in (cls.a, cls.b):
            datos["cotizacion"] = cls.crear_cotizacion(datos)
            HistorialPrecioConcepto.objects.create(
                concepto=datos["concepto"], precio_anterior=Decimal("900.00"),
                precio_nuevo=datos["concepto"].precio, modificado_por=cls.superusuario,
            )

    @classmethod
    def crear_sitio(cls, nombre):
        sitio = Sitio.objects.create(nombre=nombre, ciudad=cls.ctg)
        salon = Salon.objects.create(sitio=sitio, nombre=f"Salón {nombre}")
        return {
            "sitio": sitio,
            "salon": salon,
            "salon_montaje": SalonMontaje.objects.create(salon=salon, montaje=cls.montaje, aforo=100),
            "concepto": Concepto.objects.create(sitio=sitio, nombre="Almuerzo", precio=Decimal("1000.00")),
        }

    @classmethod
    def crear_cotizacion(cls, datos):
        hoy = timezone.localdate()
        cotizacion = Cotizacion.objects.create(
            sitio=datos["sitio"], cliente=cls.cliente, usuario=cls.superusuario, salon=datos["salon"],
            montaje=cls.montaje, fecha_evento=hoy + timedelta(days=30),
            validez_oferta=hoy + timedelta(days=10), cantidad_personas=20,
        )
        CotizacionItem.objects.create(
            cotizacion=cotizacion, concepto=datos["concepto"], cantidad=1, precio_unitario=Decimal("1000.00"),
        )
        return cotizacion

    def payload_cotizacion(self, salon, concepto):
        return {
            "cliente": self.cliente.pk, "salon": salon.pk, "montaje": self.montaje.pk,
            "fecha_evento": str(timezone.localdate() + timedelta(days=40)), "cantidad_personas": 10,
            "items": [{"concepto": concepto.pk, "cantidad": 1}],
        }

    def listas(self, d):
        """(url, ids esperados de un sitio) para cada lista filtrada por sitio."""
        return [
            ("/api/sitios/", {d["sitio"].pk}),
            ("/api/salones/", {d["salon"].pk}),
            ("/api/salon-montajes/", {d["salon_montaje"].pk}),
            ("/api/conceptos/", {d["concepto"].pk}),
            ("/api/cotizaciones/", {d["cotizacion"].pk}),
            ("/api/calendario/", {d["cotizacion"].pk}),
        ]


class ListasPorSitioTests(MultiSitioBaseTest):
    def test_cada_administrador_ve_solo_lo_de_su_sitio(self):
        for admin, propio in ((self.admin_a, self.a), (self.admin_b, self.b)):
            self.client.force_authenticate(user=admin)
            for url, esperados in self.listas(propio):
                with self.subTest(admin=admin.username, url=url):
                    r = self.client.get(url)
                    self.assertEqual(r.status_code, status.HTTP_200_OK)
                    self.assertEqual(ids(r), esperados)

    def test_superusuario_ve_todo(self):
        self.client.force_authenticate(user=self.superusuario)
        for (url, de_a), (_, de_b) in zip(self.listas(self.a), self.listas(self.b)):
            with self.subTest(url=url):
                self.assertEqual(ids(self.client.get(url)), de_a | de_b)

    def test_administrador_sin_sitios_no_ve_nada(self):
        self.client.force_authenticate(user=self.admin_sin_sitios)
        for url, _ in self.listas(self.a):
            with self.subTest(url=url):
                r = self.client.get(url)
                self.assertEqual(r.status_code, status.HTTP_200_OK)
                self.assertEqual(r.json(), [])
        self.assertEqual(
            self.client.get(f"/api/conceptos/{self.a['concepto'].pk}/").status_code, status.HTTP_404_NOT_FOUND
        )
        r = self.client.post("/api/salones/", {"sitio": self.a["sitio"].pk, "nombre": "Nuevo"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_calendario_con_salon_de_otro_sitio_devuelve_lista_vacia(self):
        self.client.force_authenticate(user=self.admin_a)
        r = self.client.get(f"/api/calendario/?salon={self.b['salon'].pk}")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json(), [])

    def test_montajes_siguen_compartidos(self):
        for admin in (self.admin_a, self.admin_b):
            self.client.force_authenticate(user=admin)
            self.assertIn(self.montaje.pk, ids(self.client.get("/api/montajes/")))


class DetallesDeOtroSitioTests(MultiSitioBaseTest):
    """Un id de otro sitio da 404 (no 403): no se revela que existe."""

    def setUp(self):
        self.client.force_authenticate(user=self.admin_a)

    def test_get_de_otro_sitio_da_404(self):
        for url in (
            f"/api/conceptos/{self.b['concepto'].pk}/",
            f"/api/conceptos/{self.b['concepto'].pk}/historial/",
            f"/api/cotizaciones/{self.b['cotizacion'].pk}/",
        ):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

    def test_escrituras_sobre_otro_sitio_dan_404_y_no_cambian_nada(self):
        concepto, cotizacion = self.b["concepto"], self.b["cotizacion"]
        r = self.client.patch(f"/api/conceptos/{concepto.pk}/", {"precio": "1"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        nueva = str(timezone.localdate() + timedelta(days=5))
        r = self.client.patch(f"/api/cotizaciones/{cotizacion.pk}/", {"validez_oferta": nueva}, format="json")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        r = self.client.post(
            f"/api/cotizaciones/{cotizacion.pk}/aceptacion/", {"tipo": "transferencia", "monto": "100"}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

        concepto.refresh_from_db()
        cotizacion.refresh_from_db()
        self.assertEqual(concepto.precio, Decimal("1000.00"))
        self.assertEqual(cotizacion.estado, "cotizado")
        self.assertEqual(cotizacion.validez_oferta, timezone.localdate() + timedelta(days=10))

    def test_salones_y_montajes_habilitados_de_otro_sitio_dan_404(self):
        # SGDE-88: detalle, edición y borrado.
        salon, habilitado = self.b["salon"], self.b["salon_montaje"]
        salon_url, habilitado_url = f"/api/salones/{salon.pk}/", f"/api/salon-montajes/{habilitado.pk}/"
        for metodo, url, datos in (
            ("get", salon_url, None),
            ("patch", salon_url, {"nombre": "Intruso"}),
            ("get", habilitado_url, None),
            ("patch", habilitado_url, {"aforo": 1}),
            ("delete", habilitado_url, None),
        ):
            with self.subTest(metodo=metodo, url=url):
                r = getattr(self.client, metodo)(url, datos, format="json")
                self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

        salon.refresh_from_db()
        habilitado.refresh_from_db()
        self.assertEqual(salon.nombre, "Salón Finca B")
        self.assertEqual(habilitado.aforo, 100)

    def test_bloquear_o_liberar_una_cotizacion_de_otro_sitio_da_404(self):
        # SEG-010: la ruta vieja /api/rack/bloqueos/ sí lo permitía.
        cotizacion = self.b["cotizacion"]
        url = f"/api/cotizaciones/{cotizacion.pk}/bloqueo/"
        hasta = (timezone.now() + timedelta(days=1)).isoformat()
        self.assertEqual(self.client.post(url, {"bloqueo_hasta": hasta}, format="json").status_code,
                         status.HTTP_404_NOT_FOUND)
        cotizacion.refresh_from_db()
        self.assertEqual(cotizacion.estado, "cotizado")

        cotizacion.estado, cotizacion.bloqueo_hasta = "bloqueado", timezone.now() + timedelta(days=1)
        cotizacion.save()
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        cotizacion.refresh_from_db()
        self.assertEqual(cotizacion.estado, "bloqueado")

    def test_cancelar_una_cotizacion_de_otro_sitio_da_404(self):
        cotizacion = self.b["cotizacion"]
        cotizacion.estado = "confirmado"
        cotizacion.save()
        r = self.client.post(
            f"/api/cotizaciones/{cotizacion.pk}/cancelacion/", {"penalizacion_pct": "10", "motivo": "X"}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        cotizacion.refresh_from_db()
        self.assertEqual(cotizacion.estado, "confirmado")

    def test_movimientos_de_otro_sitio_dan_404_y_su_salon_da_lista_vacia(self):
        # SGDE-62
        self.assertEqual(
            self.client.get(f"/api/cotizaciones/{self.b['cotizacion'].pk}/movimientos/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        r = self.client.get("/api/cotizaciones/", {"salon": self.b["salon"].pk})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json(), [])

    def test_historial_de_un_concepto_inexistente_da_404(self):
        self.assertEqual(self.client.get("/api/conceptos/999999/historial/").status_code, status.HTTP_404_NOT_FOUND)

    def test_el_propio_sitio_sigue_funcionando(self):
        r = self.client.get(f"/api/conceptos/{self.a['concepto'].pk}/historial/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 1)
        r = self.client.post(
            f"/api/cotizaciones/{self.a['cotizacion'].pk}/aceptacion/",
            {"tipo": "transferencia", "monto": "500"}, format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)


class CrearEnOtroSitioTests(MultiSitioBaseTest):
    """Crear o editar apuntando a un sitio, salón o concepto ajeno da 400."""

    def setUp(self):
        self.client.force_authenticate(user=self.admin_a)

    def assert_400_en(self, respuesta, campo):
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(campo, respuesta.json())

    def test_salon_en_sitio_ajeno(self):
        antes = Salon.objects.count()
        r = self.client.post("/api/salones/", {"sitio": self.b["sitio"].pk, "nombre": "Intruso"}, format="json")
        self.assert_400_en(r, "sitio")
        self.assertEqual(Salon.objects.count(), antes)

    def test_salon_en_sitio_propio_y_nombre_unico_por_sitio(self):
        datos = {"sitio": self.a["sitio"].pk, "nombre": "Salón Nuevo"}
        self.assertEqual(self.client.post("/api/salones/", datos, format="json").status_code, status.HTTP_201_CREATED)
        r = self.client.post("/api/salones/", datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", r.json())

    def test_montaje_habilitado_en_salon_ajeno(self):
        montaje = Montaje.objects.create(codigo="test_escuela", nombre="Escuela Test")
        r = self.client.post(
            "/api/salon-montajes/", {"salon": self.b["salon"].pk, "montaje": montaje.pk, "aforo": 10}, format="json"
        )
        self.assert_400_en(r, "salon")
        self.assertFalse(SalonMontaje.objects.filter(montaje=montaje).exists())

    def test_concepto_en_sitio_ajeno_al_crear_y_al_editar(self):
        r = self.client.post(
            "/api/conceptos/", {"sitio": self.b["sitio"].pk, "nombre": "Intruso", "precio": "1"}, format="json"
        )
        self.assert_400_en(r, "sitio")
        concepto = self.a["concepto"]
        r = self.client.patch(f"/api/conceptos/{concepto.pk}/", {"sitio": self.b["sitio"].pk}, format="json")
        self.assert_400_en(r, "sitio")
        concepto.refresh_from_db()
        self.assertEqual(concepto.sitio, self.a["sitio"])

    def test_cotizacion_con_salon_o_concepto_ajeno(self):
        antes = Cotizacion.objects.count()
        r = self.client.post(
            "/api/cotizaciones/", self.payload_cotizacion(self.b["salon"], self.b["concepto"]), format="json"
        )
        self.assert_400_en(r, "salon")
        r = self.client.post(
            "/api/cotizaciones/", self.payload_cotizacion(self.a["salon"], self.b["concepto"]), format="json"
        )
        self.assert_400_en(r, "items")
        # Una posición por item, como las demás reglas de la cotización.
        self.assertIn("concepto", r.json()["items"][0])
        self.assertEqual(Cotizacion.objects.count(), antes)

    def test_cotizacion_en_sitio_propio_se_crea(self):
        r = self.client.post(
            "/api/cotizaciones/", self.payload_cotizacion(self.a["salon"], self.a["concepto"]), format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.json()["sitio"]["id"], self.a["sitio"].pk)


class SitiosTests(MultiSitioBaseTest):
    def test_el_sitio_creado_se_asigna_al_creador(self):
        self.client.force_authenticate(user=self.admin_a)
        r = self.client.post("/api/sitios/", {"nombre": "Casa C", "ciudad": self.ctg.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        nuevo = r.json()["id"]
        self.assertTrue(self.admin_a.sitios.filter(pk=nuevo).exists())
        self.assertIn(nuevo, ids(self.client.get("/api/sitios/")))

        self.client.force_authenticate(user=self.admin_b)
        self.assertNotIn(nuevo, ids(self.client.get("/api/sitios/")))


class ClientesCompartidosTests(MultiSitioBaseTest):
    """El cliente es compartido; sus cotizaciones anidadas, no."""

    def cotizaciones_del_cliente(self, respuesta):
        return {c["id"] for c in respuesta.json()["cotizaciones"]}

    def test_cada_administrador_ve_al_cliente_con_solo_sus_cotizaciones(self):
        url = f"/api/clientes/{self.cliente.pk}/"
        for admin, propio in ((self.admin_a, self.a), (self.admin_b, self.b)):
            self.client.force_authenticate(user=admin)
            with self.subTest(admin=admin.username):
                r = self.client.get(url)
                self.assertEqual(r.status_code, status.HTTP_200_OK)
                self.assertEqual(self.cotizaciones_del_cliente(r), {propio["cotizacion"].pk})
                lista = self.client.get("/api/clientes/").json()
                fila = next(c for c in lista if c["id"] == self.cliente.pk)
                self.assertEqual({c["id"] for c in fila["cotizaciones"]}, {propio["cotizacion"].pk})

    def test_la_respuesta_del_patch_tampoco_muestra_cotizaciones_ajenas(self):
        self.client.force_authenticate(user=self.admin_a)
        r = self.client.patch(f"/api/clientes/{self.cliente.pk}/", {"telefono": "3000000000"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(self.cotizaciones_del_cliente(r), {self.a["cotizacion"].pk})

    def test_superusuario_ve_todas_las_cotizaciones_del_cliente(self):
        self.client.force_authenticate(user=self.superusuario)
        r = self.client.get(f"/api/clientes/{self.cliente.pk}/")
        self.assertEqual(self.cotizaciones_del_cliente(r), {self.a["cotizacion"].pk, self.b["cotizacion"].pk})


class UsuariosPorSitioTests(MultiSitioBaseTest):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.companero_a = crear_usuario("companero_a@test.com", "proveedor", sitios=[cls.a["sitio"]])
        cls.de_ambos = crear_usuario("ambos@test.com", "proveedor", sitios=[cls.a["sitio"], cls.b["sitio"]])
        cls.sin_sitios = crear_usuario("proveedor_libre@test.com", "proveedor")
        cls.super_con_sitio_a = crear_usuario("super_a@test.com", sitios=[cls.a["sitio"]], superusuario=True)

    def usernames(self):
        r = self.client.get("/api/usuarios/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        return {u["username"] for u in r.json()}

    def test_administrador_ve_a_si_mismo_a_sus_companeros_y_a_los_sin_sitios(self):
        self.client.force_authenticate(user=self.admin_a)
        self.assertEqual(self.usernames(), {
            "admin_a@test.com", "companero_a@test.com", "ambos@test.com",
            # Sin sitios: visibles para poder gestionarlos (decisión de SGDE-90).
            # Los superusuarios no aparecen nunca (ver la prueba siguiente).
            "proveedor_libre@test.com", "sin_sitios@test.com",
        })
        self.assertEqual(self.client.get(f"/api/usuarios/{self.admin_b.pk}/").status_code, status.HTTP_404_NOT_FOUND)

    def test_administrador_nunca_ve_ni_toca_a_un_superusuario(self):
        """Con o sin sitios en común: lista sin superusuarios y su detalle da 404 en GET, PATCH y DELETE."""
        self.client.force_authenticate(user=self.admin_a)
        visibles = self.usernames()
        for superusuario in (self.superusuario, self.super_con_sitio_a):
            with self.subTest(superusuario=superusuario.username):
                self.assertNotIn(superusuario.username, visibles)
                sitios_antes = set(superusuario.sitios.values_list("pk", flat=True))
                url = f"/api/usuarios/{superusuario.pk}/"
                self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
                r = self.client.patch(
                    url, {"email": "cambiado@test.com", "is_active": False, "sitios": []}, format="json"
                )
                self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
                self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)

                superusuario.refresh_from_db()
                self.assertTrue(superusuario.is_active)
                self.assertTrue(superusuario.is_superuser)
                self.assertNotEqual(superusuario.email, "cambiado@test.com")
                self.assertEqual(superusuario.rol.codigo, "administrador")
                self.assertEqual(set(superusuario.sitios.values_list("pk", flat=True)), sitios_antes)

        # La lista con ?incluir_inactivos tampoco los muestra.
        r = self.client.get("/api/usuarios/?incluir_inactivos=true")
        self.assertFalse({"super@test.com", "super_a@test.com"} & {u["username"] for u in r.json()})

    def test_superusuario_ve_a_todos(self):
        self.client.force_authenticate(user=self.superusuario)
        self.assertEqual(self.usernames(), set(Usuario.objects.values_list("username", flat=True)))

    def test_no_puede_asignar_un_sitio_ajeno(self):
        self.client.force_authenticate(user=self.admin_a)
        rol = Rol.objects.get(codigo="proveedor")
        datos = {"username": "nuevo@test.com", "email": "nuevo@test.com", "password": PASSWORD,
                 "rol": rol.pk, "sitios": [self.b["sitio"].pk]}
        for url in ("/api/usuarios/", "/api/usuarios/registro/"):
            with self.subTest(url=url):
                r = self.client.post(url, datos, format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("sitios", r.json())
        self.assertFalse(Usuario.objects.filter(username="nuevo@test.com").exists())

        # Ni siquiera a sí mismo: así no se salta el filtro.
        r = self.client.patch(f"/api/usuarios/{self.admin_a.pk}/", {"sitios": [self.b["sitio"].pk]}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(self.admin_a.sitios.all()), {self.a["sitio"]})

    def test_al_editar_conserva_los_sitios_que_no_administra(self):
        self.client.force_authenticate(user=self.admin_a)
        r = self.client.patch(f"/api/usuarios/{self.de_ambos.pk}/", {"sitios": []}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(set(self.de_ambos.sitios.all()), {self.b["sitio"]})

    def test_puede_asignar_su_sitio_a_un_usuario_sin_sitios(self):
        self.client.force_authenticate(user=self.admin_a)
        r = self.client.patch(
            f"/api/usuarios/{self.sin_sitios.pk}/", {"sitios": [self.a["sitio"].pk]}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(set(self.sin_sitios.sitios.all()), {self.a["sitio"]})


class RutaDeBloqueosRetiradaTests(MultiSitioBaseTest):
    """SEG-010: /api/rack/bloqueos/ veía y bloqueaba cotizaciones de otros sitios. Se retiró."""

    def test_la_ruta_ya_no_existe_y_no_bloquea_nada(self):
        self.client.force_authenticate(user=self.admin_a)
        url = "/api/rack/bloqueos/"
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        cotizacion = self.b["cotizacion"]
        hasta = (timezone.now() + timedelta(days=1)).isoformat()
        r = self.client.post(url, {"cotizacion": cotizacion.pk, "bloqueo_hasta": hasta}, format="json")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        cotizacion.refresh_from_db()
        self.assertEqual(cotizacion.estado, "cotizado")
        self.assertIsNone(cotizacion.bloqueo_hasta)


class RevisarSitiosComandoTests(MultiSitioBaseTest):
    def test_lista_administradores_sin_sitios_y_no_cambia_nada(self):
        salida = StringIO()
        call_command("revisar_sitios", stdout=salida)
        texto = salida.getvalue()
        self.assertIn("sin_sitios@test.com (NO VERÁ NINGÚN DATO)", texto)
        self.assertIn("super@test.com (superusuario: ve todo igual)", texto)
        self.assertNotIn("admin_a@test.com", texto)
        self.assertFalse(self.admin_sin_sitios.sitios.exists())

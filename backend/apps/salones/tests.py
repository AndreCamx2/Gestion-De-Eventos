"""Editar salones y editar o quitar montajes habilitados (SGDE-88).

El 404 de un id de otro sitio está en apps/sitios/tests.py y el 401/403 por rol
en ENDPOINTS_ADMIN_DETALLE (apps/usuarios/tests.py).
"""
from datetime import timedelta
from decimal import Decimal

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import Concepto
from apps.clientes.models import Cliente
from apps.cotizaciones.models import Cotizacion
from apps.sitios.models import Ciudad, Sitio
from apps.usuarios.models import Rol, Usuario

from .models import Montaje, Salon, SalonMontaje

PASSWORD = "Clave-Segura-123"


def salon_url(pk):
    return f"/api/salones/{pk}/"


def salon_montaje_url(pk):
    return f"/api/salon-montajes/{pk}/"


class BaseSalonesTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        ctg = Ciudad.objects.get(codigo="CTG")
        cls.sitio = Sitio.objects.create(nombre="Hotel A", ciudad=ctg)
        cls.otro_sitio_propio = Sitio.objects.create(nombre="Hotel A2", ciudad=ctg)
        cls.admin = Usuario.objects.create_user(
            username="admin@test.com", password=PASSWORD, rol=Rol.objects.get(codigo="administrador")
        )
        cls.admin.sitios.set([cls.sitio, cls.otro_sitio_propio])
        cls.cliente = Cliente.objects.create(tipo="natural", nombre="Ana Pérez", identificacion="1047000111")
        cls.auditorio = Montaje.objects.create(codigo="test_auditorio", nombre="Auditorio Test")
        cls.coctel = Montaje.objects.create(codigo="test_coctel", nombre="Cóctel Test")
        cls.salon = Salon.objects.create(sitio=cls.sitio, nombre="Salón Mar", ancho=10, altura=4)
        cls.otro_salon = Salon.objects.create(sitio=cls.sitio, nombre="Salón Sol")

    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.habilitado = SalonMontaje.objects.create(salon=self.salon, montaje=self.auditorio, aforo=100)

    def cotizar(self, estado="cotizado", dias_evento=30, dias_validez=10, personas=50, montaje=None):
        """Cotización del salón; días relativos a hoy (negativos = en el pasado)."""
        hoy = timezone.localdate()
        return Cotizacion.objects.create(
            sitio=self.sitio, cliente=self.cliente, usuario=self.admin, salon=self.salon,
            montaje=montaje or self.auditorio, estado=estado, cantidad_personas=personas,
            fecha_evento=hoy + timedelta(days=dias_evento), validez_oferta=hoy + timedelta(days=dias_validez),
        )


class ListadoSalonesTests(BaseSalonesTests):
    """SGDE-104: el listado trae sitio_nombre sin sumar consultas."""

    def test_cada_salon_trae_el_nombre_de_su_sitio(self):
        Salon.objects.create(sitio=self.otro_sitio_propio, nombre="Salón Luna")
        respuesta = self.client.get("/api/salones/")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        nombres = {s["nombre"]: s["sitio_nombre"] for s in respuesta.json()}
        self.assertEqual(nombres, {"Salón Mar": "Hotel A", "Salón Sol": "Hotel A", "Salón Luna": "Hotel A2"})

    def test_sitio_nombre_es_de_solo_lectura(self):
        respuesta = self.client.patch(salon_url(self.salon.pk), {"sitio_nombre": "Otro"}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.json()["sitio_nombre"], "Hotel A")

    def test_mismas_consultas_con_2_que_con_6_salones(self):
        with CaptureQueriesContext(connection) as con_dos:
            self.client.get("/api/salones/")
        for i in range(4):
            Salon.objects.create(sitio=self.otro_sitio_propio, nombre=f"Salón extra {i}")
        with CaptureQueriesContext(connection) as con_seis:
            respuesta = self.client.get("/api/salones/")
        self.assertEqual(len(respuesta.json()), 6)
        self.assertEqual(len(con_seis), len(con_dos))


class EditarSalonTests(BaseSalonesTests):
    def test_edita_nombre_medidas_y_foto(self):
        cambios = {"nombre": "Salón Mar Azul", "ancho": "12.50", "altura": "5.00", "foto_url": "https://x.co/mar.jpg"}
        r = self.client.patch(salon_url(self.salon.pk), cambios, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.salon.refresh_from_db()
        self.assertEqual(self.salon.nombre, "Salón Mar Azul")
        self.assertEqual(str(self.salon.ancho), "12.50")
        self.assertEqual(str(self.salon.altura), "5.00")
        self.assertEqual(self.salon.foto_url, "https://x.co/mar.jpg")

    def test_get_del_detalle(self):
        r = self.client.get(salon_url(self.salon.pk))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["nombre"], "Salón Mar")

    def test_cambiar_el_sitio_da_400_aunque_sea_otro_sitio_propio(self):
        r = self.client.patch(salon_url(self.salon.pk), {"sitio": self.otro_sitio_propio.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.json()["sitio"], ["El sitio de un salón no se puede cambiar."])
        self.salon.refresh_from_db()
        self.assertEqual(self.salon.sitio, self.sitio)

    def test_enviar_el_mismo_sitio_no_es_un_cambio(self):
        r = self.client.patch(salon_url(self.salon.pk), {"sitio": self.sitio.pk, "nombre": "Mar"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_renombrar_con_el_nombre_de_otro_salon_del_sitio_da_400(self):
        r = self.client.patch(salon_url(self.salon.pk), {"nombre": "Salón Sol"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sin_put_ni_delete(self):
        self.assertEqual(self.client.put(salon_url(self.salon.pk), {}, format="json").status_code,
                         status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.delete(salon_url(self.salon.pk)).status_code,
                         status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(Salon.objects.filter(pk=self.salon.pk).exists())

    def test_medidas_negativas_dan_400_al_editar(self):
        for campo in ("ancho", "altura"):
            with self.subTest(campo=campo):
                r = self.client.patch(salon_url(self.salon.pk), {campo: "-1.00"}, format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.json()[campo], ["No puede ser negativo."])
        self.salon.refresh_from_db()
        self.assertEqual((self.salon.ancho, self.salon.altura), (Decimal("10"), Decimal("4")))

    def test_medidas_negativas_dan_400_al_crear(self):
        datos = {"sitio": self.sitio.pk, "nombre": "Salón Nuevo", "ancho": "-3", "altura": "4"}
        r = self.client.post("/api/salones/", datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.json()["ancho"], ["No puede ser negativo."])
        self.assertFalse(Salon.objects.filter(nombre="Salón Nuevo").exists())

    def test_medidas_en_cero_o_vacias_se_aceptan(self):
        r = self.client.patch(salon_url(self.salon.pk), {"ancho": "0", "altura": None}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)


class EditarMontajeHabilitadoTests(BaseSalonesTests):
    def patch(self, datos):
        return self.client.patch(salon_montaje_url(self.habilitado.pk), datos, format="json")

    def test_edita_aforo_y_foto(self):
        r = self.patch({"aforo": 120, "foto_url": "https://x.co/auditorio.jpg"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.habilitado.refresh_from_db()
        self.assertEqual(self.habilitado.aforo, 120)
        self.assertEqual(self.habilitado.foto_url, "https://x.co/auditorio.jpg")

    def test_cambiar_el_salon_o_el_montaje_da_400(self):
        for campo, valor in (("salon", self.otro_salon.pk), ("montaje", self.coctel.pk)):
            with self.subTest(campo=campo):
                r = self.patch({campo: valor})
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(campo, r.json())
        self.habilitado.refresh_from_db()
        self.assertEqual((self.habilitado.salon, self.habilitado.montaje), (self.salon, self.auditorio))

    def test_bajar_el_aforo_por_debajo_de_una_cotizacion_futura_activa_da_400(self):
        self.cotizar(estado="confirmado", personas=80)
        r = self.patch({"aforo": 79})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("80 personas", r.json()["aforo"][0])
        self.habilitado.refresh_from_db()
        self.assertEqual(self.habilitado.aforo, 100)

    def test_bajar_el_aforo_hasta_la_cotizacion_mas_grande_si_se_puede(self):
        self.cotizar(personas=80)
        self.assertEqual(self.patch({"aforo": 80}).status_code, status.HTTP_200_OK)

    def test_un_evento_pasado_o_una_cotizacion_vencida_no_bloquean_bajar_el_aforo(self):
        self.cotizar(estado="confirmado", dias_evento=-1, dias_validez=-10, personas=95)
        self.cotizar(estado="cotizado", dias_evento=30, dias_validez=-1, personas=90)
        self.cotizar(estado="cancelado", personas=99)
        self.cotizar(montaje=self.coctel, personas=98)  # Otro montaje del salón: no cuenta.
        self.assertEqual(self.patch({"aforo": 10}).status_code, status.HTTP_200_OK)


class QuitarMontajeHabilitadoTests(BaseSalonesTests):
    def quitar(self):
        return self.client.delete(salon_montaje_url(self.habilitado.pk))

    def assertSigueHabilitado(self, sigue=True):
        self.assertEqual(SalonMontaje.objects.filter(pk=self.habilitado.pk).exists(), sigue)

    def test_sin_cotizaciones_se_quita(self):
        self.assertEqual(self.quitar().status_code, status.HTTP_204_NO_CONTENT)
        self.assertSigueHabilitado(False)

    def test_una_cotizacion_futura_activa_bloquea_con_409(self):
        for estado in ("cotizado", "bloqueado", "confirmado"):
            with self.subTest(estado=estado):
                cotizacion = self.cotizar(estado=estado)
                r = self.quitar()
                self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
                self.assertEqual(
                    r.json(),
                    {"detail": "No se puede quitar el montaje: tiene 1 cotización activa "
                               "(cotizadas vigentes, bloqueadas o confirmadas, con evento de hoy en adelante)."},
                )
                self.assertSigueHabilitado()
                cotizacion.delete()

    def test_el_mensaje_dice_cuantas_son(self):
        self.cotizar(estado="bloqueado")
        self.cotizar(estado="confirmado")
        self.cotizar(estado="cotizado", dias_evento=0)  # El evento de hoy todavía cuenta.
        self.assertIn("3 cotizaciones activas", self.quitar().json()["detail"])
        self.assertSigueHabilitado()

    def test_solo_canceladas_se_quita(self):
        self.cotizar(estado="cancelado")
        self.assertEqual(self.quitar().status_code, status.HTTP_204_NO_CONTENT)
        self.assertSigueHabilitado(False)

    def test_un_evento_pasado_no_bloquea(self):
        self.cotizar(estado="confirmado", dias_evento=-1, dias_validez=-10)
        self.assertEqual(self.quitar().status_code, status.HTTP_204_NO_CONTENT)
        self.assertSigueHabilitado(False)

    def test_una_cotizada_vencida_no_bloquea(self):
        self.cotizar(estado="cotizado", dias_evento=30, dias_validez=-1)
        self.assertEqual(self.quitar().status_code, status.HTTP_204_NO_CONTENT)
        self.assertSigueHabilitado(False)

    def test_una_cotizacion_de_otro_montaje_del_salon_no_bloquea(self):
        self.cotizar(estado="confirmado", montaje=self.coctel)
        self.assertEqual(self.quitar().status_code, status.HTTP_204_NO_CONTENT)
        self.assertSigueHabilitado(False)


class BloqueoDelMontajeTests(BaseSalonesTests):
    """SGDE-100: quitar o editar un montaje habilitado toma el mismo bloqueo que crear una cotización."""

    def tablas_bloqueadas(self, peticion):
        with CaptureQueriesContext(connection) as contexto:
            respuesta = peticion()
        sqls = [c["sql"] for c in contexto.captured_queries if "FOR UPDATE" in c["sql"]]
        tablas = {t for t in ("salones_salonmontaje", "salones_salon") for s in sqls
                  if s.split(" FROM ", 1)[1].startswith(f'"{t}"')}
        return respuesta, tablas

    def test_el_delete_bloquea_salon_y_montaje(self):
        r, tablas = self.tablas_bloqueadas(lambda: self.client.delete(salon_montaje_url(self.habilitado.pk)))
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(tablas, {"salones_salon", "salones_salonmontaje"})

    def test_el_patch_bloquea_salon_y_montaje(self):
        r, tablas = self.tablas_bloqueadas(
            lambda: self.client.patch(salon_montaje_url(self.habilitado.pk), {"aforo": 90}, format="json")
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(tablas, {"salones_salon", "salones_salonmontaje"})


class BajaDeSalonTests(BaseSalonesTests):
    """SGDE-99: dar de baja (borrado lógico) y reactivar un salón."""

    def baja(self, activo=False):
        return self.client.patch(salon_url(self.salon.pk), {"activo": activo}, format="json")

    def ids_del_listado(self, **params):
        return {s["id"] for s in self.client.get("/api/salones/", params).json()}

    def test_da_de_baja_y_sale_del_listado_salvo_con_incluir_inactivos(self):
        r = self.baja()
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertIs(r.json()["activo"], False)
        self.assertNotIn(self.salon.pk, self.ids_del_listado())
        self.assertIn(self.salon.pk, self.ids_del_listado(incluir_inactivos="true"))
        # El detalle sí lo muestra, para poder reactivarlo.
        self.assertEqual(self.client.get(salon_url(self.salon.pk)).status_code, status.HTTP_200_OK)

    def test_con_cotizaciones_activas_da_409_y_no_cambia(self):
        self.cotizar(estado="confirmado")
        self.cotizar(estado="cotizado", dias_evento=40)
        r = self.baja()
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("No se puede dar de baja el salón: tiene 2 cotizaciones activas", r.json()["detail"])
        self.salon.refresh_from_db()
        self.assertTrue(self.salon.activo)

    def test_eventos_pasados_canceladas_o_vencidas_no_impiden_la_baja(self):
        self.cotizar(estado="confirmado", dias_evento=-1, dias_validez=-10)
        self.cotizar(estado="cancelado")
        self.cotizar(estado="cotizado", dias_validez=-1)
        self.assertEqual(self.baja().status_code, status.HTTP_200_OK)

    def test_reactivar_siempre_se_puede(self):
        Salon.objects.filter(pk=self.salon.pk).update(activo=False)
        self.cotizar(estado="cotizado", dias_validez=-1)
        r = self.baja(activo=True)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.salon.refresh_from_db()
        self.assertTrue(self.salon.activo)

    def test_un_salon_inactivo_no_se_puede_cotizar(self):
        concepto = Concepto.objects.create(sitio=self.sitio, nombre="Almuerzo", precio=Decimal("1000"))
        self.baja()
        r = self.client.post("/api/cotizaciones/", {
            "cliente": self.cliente.pk, "salon": self.salon.pk, "montaje": self.auditorio.pk,
            "fecha_evento": str(timezone.localdate() + timedelta(days=30)), "cantidad_personas": 10,
            "items": [{"concepto": concepto.pk, "cantidad": 1}],
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.json()["salon"], ["El salón está dado de baja."])

    def test_sigue_en_sus_cotizaciones_viejas(self):
        vieja = self.cotizar(estado="confirmado", dias_evento=-5, dias_validez=-10)
        self.baja()
        r = self.client.get(f"/api/cotizaciones/{vieja.pk}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["salon"]["nombre"], "Salón Mar")
        historial = self.client.get("/api/cotizaciones/", {"salon": self.salon.pk}).json()
        self.assertEqual([c["id"] for c in historial], [vieja.pk])

    def test_una_cotizada_vencida_no_revive_en_un_salon_inactivo(self):
        # Dar de baja solo mira las activas: la vencida no se puede extender, bloquear ni confirmar.
        vencida = self.cotizar(estado="cotizado", dias_validez=-1)
        self.baja()
        url = f"/api/cotizaciones/{vencida.pk}/"
        hasta = (timezone.now() + timedelta(days=1)).isoformat()
        for peticion in (
            lambda: self.client.patch(url, {"validez_oferta": str(timezone.localdate() + timedelta(days=5))},
                                      format="json"),
            lambda: self.client.post(f"{url}bloqueo/", {"bloqueo_hasta": hasta}, format="json"),
            lambda: self.client.post(f"{url}aceptacion/", {"tipo": "efectivo", "monto": "10"}, format="json"),
        ):
            r = peticion()
            self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)
            self.assertEqual(r.json()["detail"], "El salón está dado de baja.")

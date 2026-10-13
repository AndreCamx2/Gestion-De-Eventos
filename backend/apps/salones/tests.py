"""Editar salones y editar o quitar montajes habilitados (SGDE-88).

El 404 de un id de otro sitio está en apps/sitios/tests.py y el 401/403 por rol
en ENDPOINTS_ADMIN_DETALLE (apps/usuarios/tests.py).
"""
from datetime import timedelta

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

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

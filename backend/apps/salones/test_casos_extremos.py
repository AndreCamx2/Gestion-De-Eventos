from rest_framework import status
from rest_framework.test import APITestCase

from apps.sitios.models import Ciudad, Sitio
from apps.usuarios.models import Rol, Usuario

from .models import Montaje, Salon, SalonMontaje


class SalonesExtremoTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_user(
            "admin@sgde.co", password="Clave-Segura-123", rol=Rol.objects.get(codigo="administrador")
        )
        cls.sitio = Sitio.objects.create(nombre="Hotel Caribe", ciudad=Ciudad.objects.get(codigo="CTG"))
        cls.admin.sitios.add(cls.sitio)
        cls.salon = Salon.objects.create(sitio=cls.sitio, nombre="Salón Barú")
        cls.montaje = Montaje.objects.create(codigo="test_banquete", nombre="Banquete")

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def crear_salon(self, **datos):
        return self.client.post("/api/salones/", {"sitio": self.sitio.pk, "nombre": "Salón Bocagrande", **datos}, format="json")

    def habilitar(self, aforo):
        return self.client.post(
            "/api/salon-montajes/", {"salon": self.salon.pk, "montaje": self.montaje.pk, "aforo": aforo}, format="json"
        )

    def test_no_repite_un_nombre_de_salon_cambiando_mayusculas(self):
        respuesta = self.crear_salon(nombre="SALÓN BARÚ")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nombre", respuesta.data)

    def test_medidas_absurdas_dan_400(self):
        for medida in ("0", "-1", "NaN", "Infinity", "99999999"):
            with self.subTest(medida=medida):
                self.assertEqual(self.crear_salon(altura=medida).status_code, status.HTTP_400_BAD_REQUEST)

    def test_la_foto_solo_acepta_enlaces_web(self):
        respuesta = self.crear_salon(foto_url="javascript:alert(1)")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("foto_url", respuesta.data)

    def test_un_montaje_no_se_habilita_con_aforo_cero(self):
        respuesta = self.habilitar(0)

        self.assertEqual(respuesta.data["aforo"], ["El aforo debe ser de al menos 1 persona."])

    def test_un_aforo_enorme_da_400_y_no_500(self):
        respuesta = self.habilitar(10**12)

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(SalonMontaje.objects.exists())

    def test_un_aforo_razonable_se_habilita(self):
        self.assertEqual(self.habilitar(250).status_code, status.HTTP_201_CREATED)

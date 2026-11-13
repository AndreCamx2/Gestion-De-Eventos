from rest_framework import status
from rest_framework.test import APITestCase

from apps.usuarios.models import Rol, Usuario

from .models import Ciudad, Sitio


class SitioExtremoTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.superusuario = Usuario.objects.create_superuser(
            "super@sgde.co", password="Clave-Segura-123", rol=Rol.objects.get(codigo="administrador")
        )
        cls.ciudad = Ciudad.objects.get(codigo="CTG")
        Sitio.objects.create(nombre="Hotel Caribe", ciudad=cls.ciudad)

    def setUp(self):
        self.client.force_authenticate(self.superusuario)

    def crear(self, **datos):
        return self.client.post("/api/sitios/", {"nombre": "Finca La Ceiba", "ciudad": self.ciudad.pk, **datos}, format="json")

    def test_no_repite_un_venue_en_la_misma_ciudad_cambiando_mayusculas(self):
        respuesta = self.crear(nombre="  hotel caribe ")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nombre", respuesta.data)

    def test_un_nombre_de_solo_espacios_da_400(self):
        self.assertEqual(self.crear(nombre="   ").status_code, status.HTTP_400_BAD_REQUEST)

    def test_una_ciudad_que_no_existe_da_400(self):
        self.assertEqual(self.crear(ciudad=999_999).status_code, status.HTTP_400_BAD_REQUEST)

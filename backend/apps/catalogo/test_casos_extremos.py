from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.sitios.models import Ciudad, Sitio
from apps.usuarios.models import Rol, Usuario

from .models import Concepto


class ConceptoExtremoTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_user(
            "admin@sgde.co", password="Clave-Segura-123", rol=Rol.objects.get(codigo="administrador")
        )
        cls.sitio = Sitio.objects.create(nombre="Hotel Caribe", ciudad=Ciudad.objects.get(codigo="CTG"))
        cls.admin.sitios.add(cls.sitio)
        Concepto.objects.create(sitio=cls.sitio, nombre="Almuerzo ejecutivo", precio=Decimal("45000"))

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def crear(self, **datos):
        cuerpo = {"sitio": self.sitio.pk, "nombre": "Video beam", "precio": "250000", "impuesto_pct": "19", **datos}
        return self.client.post("/api/conceptos/", cuerpo, format="json")

    def test_el_impuesto_va_de_0_a_100(self):
        for impuesto in ("-5", "150"):
            with self.subTest(impuesto=impuesto):
                self.assertEqual(self.crear(impuesto_pct=impuesto).status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_repite_un_concepto_del_venue_cambiando_mayusculas(self):
        respuesta = self.crear(nombre="ALMUERZO EJECUTIVO ")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nombre", respuesta.data)

    def test_un_precio_de_mas_de_diez_digitos_enteros_da_400(self):
        self.assertEqual(self.crear(precio="10000000000000").status_code, status.HTTP_400_BAD_REQUEST)

    def test_una_cortesia_puede_costar_cero(self):
        self.assertEqual(self.crear(nombre="Agua de cortesía", precio="0", impuesto_pct="0").status_code, status.HTTP_201_CREATED)

from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.validadores import MSG_DOCUMENTO
from apps.usuarios.models import Rol, Usuario

from .models import Proveedor, StockElemento

PASSWORD = "Clave-Segura-123"


class ProveedorExtremoTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_user(
            "admin@sgde.co", password=PASSWORD, rol=Rol.objects.get(codigo="administrador")
        )
        cls.usuario_proveedor = Usuario.objects.create_user(
            "sonido@sgde.co", password=PASSWORD, rol=Rol.objects.get(codigo="proveedor")
        )
        cls.proveedor = Proveedor.objects.create(nombre="Sonido Caribe", usuario=cls.usuario_proveedor)
        StockElemento.objects.create(proveedor=cls.proveedor, nombre_elemento="Sillas Tiffany", cantidad=200, valor=8000)

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def test_nombre_de_proveedor_hecho_de_signos_da_400(self):
        respuesta = self.client.post("/api/proveedores/", {"nombre": "!!!"}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nombre", respuesta.data)

    def crear(self, nombre, identificacion):
        return self.client.post("/api/proveedores/", {"nombre": nombre, "identificacion": identificacion}, format="json")

    def test_la_identificacion_acepta_cedula_o_nit(self):
        self.assertEqual(self.crear("Luces del Mar", "1047000111").status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.crear("Carpas Bolívar", "900123456-8").status_code, status.HTTP_201_CREATED)

    def test_la_identificacion_con_letras_da_400(self):
        self.assertEqual(self.crear("Luces del Mar", "abc!!").data["identificacion"], [MSG_DOCUMENTO])

    def test_no_repite_un_elemento_del_proveedor_cambiando_mayusculas(self):
        respuesta = self.client.post(
            "/api/stock/", {"proveedor": self.proveedor.pk, "nombre_elemento": "SILLAS TIFFANY", "cantidad": 1, "valor": "1"},
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nombre_elemento", respuesta.data)

    def test_una_cantidad_de_stock_enorme_da_400_y_no_500(self):
        respuesta = self.client.post(
            "/api/stock/", {"proveedor": self.proveedor.pk, "nombre_elemento": "Mesas", "cantidad": 10**12, "valor": "1"},
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cantidad", respuesta.data)

    def test_mi_stock_tampoco_repite_un_elemento_cambiando_mayusculas(self):
        self.client.force_authenticate(self.usuario_proveedor)

        respuesta = self.client.post(
            "/api/mi-stock/", {"nombre_elemento": "sillas tiffany", "cantidad": 1, "valor": "1"}, format="json"
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nombre_elemento", respuesta.data)

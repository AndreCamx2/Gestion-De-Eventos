"""Editar el stock de un proveedor (SGDE-98).

El 401/403 por rol está en ENDPOINTS_ADMIN_DETALLE (apps/usuarios/tests.py).
"""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.usuarios.models import Rol, Usuario

from .models import Proveedor, StockElemento

PASSWORD = "Clave-Segura-123"


def stock_url(pk):
    return f"/api/stock/{pk}/"


class EditarStockTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_user(
            username="admin@test.com", password=PASSWORD, rol=Rol.objects.get(codigo="administrador")
        )
        cls.proveedor = Proveedor.objects.create(nombre="Sonido Caribe")
        cls.otro_proveedor = Proveedor.objects.create(nombre="Luces del Mar")

    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.elemento = StockElemento.objects.create(
            proveedor=self.proveedor, nombre_elemento="Micrófono", cantidad=10, valor=Decimal("50000")
        )

    def patch(self, datos):
        return self.client.patch(stock_url(self.elemento.pk), datos, format="json")

    def test_edita_cantidad_y_valor(self):
        r = self.patch({"cantidad": 0, "valor": "65000.50"})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.elemento.refresh_from_db()
        self.assertEqual((self.elemento.cantidad, self.elemento.valor), (0, Decimal("65000.50")))

    def test_get_del_detalle(self):
        r = self.client.get(stock_url(self.elemento.pk))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["nombre_elemento"], "Micrófono")

    def test_proveedor_o_nombre_distintos_dan_400(self):
        for campo, valor in (("proveedor", self.otro_proveedor.pk), ("nombre_elemento", "Parlante")):
            with self.subTest(campo=campo):
                r = self.patch({campo: valor})
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.data[campo], ["No se puede cambiar: crea un elemento nuevo."])
        self.elemento.refresh_from_db()
        self.assertEqual((self.elemento.proveedor, self.elemento.nombre_elemento), (self.proveedor, "Micrófono"))

    def test_enviar_los_mismos_valores_no_es_un_cambio(self):
        r = self.patch({"proveedor": self.proveedor.pk, "nombre_elemento": "Micrófono", "cantidad": 3})
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_cantidad_o_valor_negativos_dan_400(self):
        for datos in ({"cantidad": -1}, {"valor": "-1"}):
            with self.subTest(datos=datos):
                self.assertEqual(self.patch(datos).status_code, status.HTTP_400_BAD_REQUEST)

    def test_sin_put_ni_delete(self):
        self.assertEqual(self.client.put(stock_url(self.elemento.pk), {}, format="json").status_code,
                         status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.delete(stock_url(self.elemento.pk)).status_code,
                         status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_inexistente_404(self):
        self.assertEqual(self.client.patch(stock_url(999999), {"cantidad": 1}, format="json").status_code,
                         status.HTTP_404_NOT_FOUND)

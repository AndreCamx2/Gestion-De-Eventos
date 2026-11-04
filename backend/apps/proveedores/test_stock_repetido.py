"""Un proveedor no repite un elemento por mayúsculas o espacios (SGDE-135)."""
from decimal import Decimal

from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.test import APITestCase

from apps.usuarios.models import Rol, Usuario

from .models import Proveedor, StockElemento

PASSWORD = "Clave-Segura-123"
MENSAJE_PROVEEDOR = "Ya tienes un elemento con este nombre: edítalo."
MENSAJE_ADMIN = "Este proveedor ya tiene un elemento con ese nombre."


def crear_usuario(username, codigo_rol):
    return Usuario.objects.create_user(
        username=username, password=PASSWORD, rol=Rol.objects.get(codigo=codigo_rol)
    )


class StockRepetidoTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.usuario = crear_usuario("sillas@test.com", "proveedor")
        cls.proveedor = Proveedor.objects.create(nombre="Sillas Caribe", usuario=cls.usuario)
        cls.otro = Proveedor.objects.create(nombre="Luces del Mar")
        cls.elemento = StockElemento.objects.create(
            proveedor=cls.proveedor, nombre_elemento="Silla Tiffany", cantidad=10, valor=Decimal("8000")
        )

    def crear_en_mi_stock(self, nombre):
        self.client.force_authenticate(user=self.usuario)
        return self.client.post(
            "/api/mi-stock/", {"nombre_elemento": nombre, "cantidad": 1, "valor": "1"}, format="json"
        )

    def crear_como_admin(self, nombre, proveedor):
        self.client.force_authenticate(user=self.admin)
        return self.client.post(
            "/api/stock/",
            {"proveedor": proveedor.pk, "nombre_elemento": nombre, "cantidad": 1, "valor": "1"},
            format="json",
        )

    def test_mi_stock_rechaza_repetidos_por_mayusculas_o_espacios(self):
        for nombre in ("silla tiffany", "SILLA TIFFANY", "  Silla Tiffany  "):
            with self.subTest(nombre=nombre):
                r = self.crear_en_mi_stock(nombre)
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.data["nombre_elemento"], [MENSAJE_PROVEEDOR])

    def test_admin_rechaza_repetidos_por_mayusculas_o_espacios(self):
        for nombre in ("Silla Tiffany", "silla tiffany", " Silla Tiffany "):
            with self.subTest(nombre=nombre):
                r = self.crear_como_admin(nombre, self.proveedor)
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.data["nombre_elemento"], [MENSAJE_ADMIN])

    def test_guarda_el_nombre_sin_espacios_sobrantes(self):
        r = self.crear_en_mi_stock("  Mesa redonda ")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(StockElemento.objects.get(pk=r.data["id"]).nombre_elemento, "Mesa redonda")

    def test_otro_proveedor_puede_usar_el_mismo_nombre(self):
        r = self.crear_como_admin("silla tiffany", self.otro)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)

    def test_editar_cantidad_no_choca_consigo_mismo(self):
        self.client.force_authenticate(user=self.usuario)
        r = self.client.patch(
            f"/api/mi-stock/{self.elemento.pk}/",
            {"nombre_elemento": "Silla Tiffany", "cantidad": 3},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)

    def test_la_base_tambien_lo_impide(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            StockElemento.objects.create(
                proveedor=self.proveedor, nombre_elemento="SILLA TIFFANY", cantidad=1, valor=Decimal("1")
            )

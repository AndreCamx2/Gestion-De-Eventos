import secrets
from decimal import Decimal

from django.urls import reverse_lazy
from rest_framework import status
from rest_framework.test import APITestCase

from apps.usuarios.models import Rol, Usuario

from .models import Proveedor, StockElemento

PASSWORD = secrets.token_urlsafe(16)
URL = reverse_lazy("stock_comparar")


def crear_usuario(username, codigo_rol):
    rol = Rol.objects.get(codigo=codigo_rol)
    return Usuario.objects.create_user(username=username, password=PASSWORD, rol=rol)


def stock(proveedor, nombre, cantidad, valor):
    return StockElemento.objects.create(
        proveedor=proveedor, nombre_elemento=nombre, cantidad=cantidad, valor=Decimal(valor)
    )


class CompararStockTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.cliente_user = crear_usuario("cliente@test.com", "cliente")
        cls.prov_a = Proveedor.objects.create(nombre="Proveedor A", contacto="a@test.com")
        cls.prov_b = Proveedor.objects.create(nombre="Proveedor B", contacto="3001112233")
        cls.prov_c = Proveedor.objects.create(nombre="Proveedor C", contacto="c@test.com")
        stock(cls.prov_a, "Silla Tiffany", 10, "9000.00")
        stock(cls.prov_b, "Silla Tiffany", 5, "8000.00")
        stock(cls.prov_c, "Silla Tiffany", 0, "5000.00")  # más barata, pero agotada
        stock(cls.prov_a, "Mesa redonda", 3, "20000.00")

    def test_sin_token_recibe_401(self):
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cliente_recibe_403(self):
        self.client.force_authenticate(user=self.cliente_user)
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_marca_el_mejor_precio_ignorando_proveedores_agotados(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(URL, {"elemento": "silla"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        datos = r.json()
        self.assertEqual(len(datos), 1)
        grupo = datos[0]
        self.assertEqual(grupo["elemento"], "Silla Tiffany")
        self.assertEqual(grupo["mejor_precio"], "8000.00")
        # Disponibles de menor a mayor precio; el agotado va al final.
        self.assertEqual([o["proveedor"] for o in grupo["ofertas"]],
                         ["Proveedor B", "Proveedor A", "Proveedor C"])
        self.assertEqual([o["es_mejor_precio"] for o in grupo["ofertas"]],
                         [True, False, False])
        self.assertEqual(grupo["ofertas"][0]["contacto"], "3001112233")

    def test_busqueda_sin_distinguir_mayusculas(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(URL, {"elemento": "MESA"})
        self.assertEqual(len(r.json()), 1)
        self.assertEqual(r.json()[0]["elemento"], "Mesa redonda")

    def test_nombres_con_distinta_capitalizacion_se_agrupan(self):
        prov_d = Proveedor.objects.create(nombre="Proveedor D")
        stock(prov_d, "silla tiffany", 2, "7000.00")
        self.client.force_authenticate(user=self.admin)
        datos = self.client.get(URL, {"elemento": "silla"}).json()
        self.assertEqual(len(datos), 1)
        self.assertEqual(len(datos[0]["ofertas"]), 4)
        self.assertEqual(datos[0]["mejor_precio"], "7000.00")
        self.assertEqual(datos[0]["ofertas"][0]["proveedor"], "Proveedor D")

    def test_sin_parametro_lista_todos_los_elementos_ordenados(self):
        self.client.force_authenticate(user=self.admin)
        datos = self.client.get(URL).json()
        self.assertEqual([g["elemento"] for g in datos], ["Mesa redonda", "Silla Tiffany"])

    def test_si_todos_estan_agotados_no_hay_mejor_precio(self):
        stock(self.prov_a, "Cable HDMI", 0, "3000.00")
        stock(self.prov_b, "Cable HDMI", 0, "2500.00")
        self.client.force_authenticate(user=self.admin)
        grupo = self.client.get(URL, {"elemento": "cable"}).json()[0]
        self.assertIsNone(grupo["mejor_precio"])
        self.assertFalse(any(o["es_mejor_precio"] for o in grupo["ofertas"]))

    def test_empate_marca_a_todos_los_del_mejor_precio(self):
        stock(self.prov_a, "Mantel", 4, "6000.00")
        stock(self.prov_b, "Mantel", 9, "6000.00")
        self.client.force_authenticate(user=self.admin)
        grupo = self.client.get(URL, {"elemento": "mantel"}).json()[0]
        self.assertEqual([o["es_mejor_precio"] for o in grupo["ofertas"]], [True, True])

    def test_elemento_inexistente_devuelve_lista_vacia(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(URL, {"elemento": "no-existe"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json(), [])
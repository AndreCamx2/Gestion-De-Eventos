"""Historial de cambios de cantidad y valor del stock (SGDE-134).

Se registra igual desde /api/stock/<id>/ (administrador) y desde
/api/mi-stock/<id>/ (proveedor). El 401/403 de /api/stock/<id>/historial/ está
en ENDPOINTS_ADMIN_DETALLE (apps/usuarios/tests.py).
"""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.usuarios.permissions import CODIGO_NO_ES_PROVEEDOR

from .models import HistorialStockElemento, Proveedor, StockElemento
from .test_mi_stock import crear_usuario


def stock_url(pk):
    return f"/api/stock/{pk}/"


def mi_stock_url(pk):
    return f"/api/mi-stock/{pk}/"


class HistorialStockTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.usuario = crear_usuario("sonido@test.com", "proveedor")
        cls.proveedor = Proveedor.objects.create(nombre="Sonido Caribe", usuario=cls.usuario)
        cls.otro = Proveedor.objects.create(nombre="Luces del Mar")

    def setUp(self):
        self.elemento = StockElemento.objects.create(
            proveedor=self.proveedor, nombre_elemento="Silla Tiffany", cantidad=50, valor=Decimal("8000")
        )
        self.ajeno = StockElemento.objects.create(
            proveedor=self.otro, nombre_elemento="Reflector", cantidad=4, valor=Decimal("90000")
        )

    def editar(self, url, datos):
        return self.client.patch(url, datos, format="json")

    def test_cambiar_el_valor_deja_una_fila_con_los_dos_valores(self):
        self.client.force_authenticate(user=self.admin)
        r = self.editar(stock_url(self.elemento.pk), {"valor": "10000"})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        h = HistorialStockElemento.objects.get()
        self.assertEqual((h.valor_anterior, h.valor_nuevo), (Decimal("8000.00"), Decimal("10000.00")))
        # La cantidad no cambió, pero queda en la fila para leerla completa.
        self.assertEqual((h.cantidad_anterior, h.cantidad_nueva), (50, 50))
        self.assertEqual(h.modificado_por, self.admin)
        self.assertEqual(h.elemento, self.elemento)
        self.assertIsNotNone(h.fecha_modificacion)

    def test_cambiar_la_cantidad_desde_mi_stock_registra_al_proveedor(self):
        self.client.force_authenticate(user=self.usuario)
        r = self.editar(mi_stock_url(self.elemento.pk), {"cantidad": 45})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        h = HistorialStockElemento.objects.get()
        self.assertEqual((h.cantidad_anterior, h.cantidad_nueva), (50, 45))
        self.assertEqual((h.valor_anterior, h.valor_nuevo), (Decimal("8000.00"), Decimal("8000.00")))
        self.assertEqual(h.modificado_por, self.usuario)

    def test_cambiar_los_dos_campos_deja_una_sola_fila(self):
        self.client.force_authenticate(user=self.admin)
        self.editar(stock_url(self.elemento.pk), {"cantidad": 40, "valor": "9000"})
        h = HistorialStockElemento.objects.get()
        self.assertEqual((h.cantidad_nueva, h.valor_nuevo), (40, Decimal("9000.00")))

    def test_si_nada_cambia_no_hay_historial(self):
        self.client.force_authenticate(user=self.admin)
        for datos in ({}, {"cantidad": 50}, {"valor": "8000.00"}, {"cantidad": 50, "valor": "8000"}):
            with self.subTest(datos=datos):
                self.assertEqual(self.editar(stock_url(self.elemento.pk), datos).status_code, 200)
        self.assertFalse(HistorialStockElemento.objects.exists())

    def test_un_patch_invalido_no_deja_historial(self):
        self.client.force_authenticate(user=self.admin)
        r = self.editar(stock_url(self.elemento.pk), {"valor": "-1"})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(HistorialStockElemento.objects.exists())

    def test_crear_un_elemento_no_deja_historial(self):
        self.client.force_authenticate(user=self.usuario)
        r = self.client.post(
            "/api/mi-stock/", {"nombre_elemento": "Mesa", "cantidad": 3, "valor": "20000"}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertFalse(HistorialStockElemento.objects.exists())

    def test_historial_del_administrador_mas_reciente_primero(self):
        self.client.force_authenticate(user=self.admin)
        self.editar(stock_url(self.elemento.pk), {"valor": "9000"})
        self.editar(stock_url(self.elemento.pk), {"valor": "10000"})
        r = self.client.get(f"{stock_url(self.elemento.pk)}historial/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        datos = r.json()
        self.assertEqual([d["valor_nuevo"] for d in datos], ["10000.00", "9000.00"])
        self.assertEqual(datos[0]["valor_anterior"], "9000.00")
        self.assertEqual(datos[0]["modificado_por"], "admin@test.com")

    def test_historial_solo_trae_los_cambios_de_ese_elemento(self):
        self.client.force_authenticate(user=self.admin)
        self.editar(stock_url(self.elemento.pk), {"cantidad": 10})
        self.editar(stock_url(self.ajeno.pk), {"cantidad": 1})
        datos = self.client.get(f"{stock_url(self.elemento.pk)}historial/").json()
        self.assertEqual([d["elemento"] for d in datos], [self.elemento.pk])

    def test_el_administrador_ve_los_cambios_hechos_por_el_proveedor(self):
        self.client.force_authenticate(user=self.usuario)
        self.editar(mi_stock_url(self.elemento.pk), {"cantidad": 30})
        self.client.force_authenticate(user=self.admin)
        datos = self.client.get(f"{stock_url(self.elemento.pk)}historial/").json()
        self.assertEqual([d["modificado_por"] for d in datos], ["sonido@test.com"])

    def test_el_proveedor_ve_el_historial_de_su_stock(self):
        self.client.force_authenticate(user=self.admin)
        self.editar(stock_url(self.elemento.pk), {"valor": "10000"})
        self.client.force_authenticate(user=self.usuario)
        r = self.client.get(f"{mi_stock_url(self.elemento.pk)}historial/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual([d["valor_nuevo"] for d in r.json()], ["10000.00"])

    def test_el_proveedor_no_ve_el_historial_de_otro_proveedor(self):
        self.client.force_authenticate(user=self.admin)
        self.editar(stock_url(self.ajeno.pk), {"cantidad": 1})
        self.client.force_authenticate(user=self.usuario)
        r = self.client.get(f"{mi_stock_url(self.ajeno.pk)}historial/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_historial_de_un_elemento_inexistente_da_404(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get(f"{stock_url(999999)}historial/").status_code, 404)
        self.client.force_authenticate(user=self.usuario)
        self.assertEqual(self.client.get(f"{mi_stock_url(999999)}historial/").status_code, 404)

    def test_el_historial_es_de_solo_lectura(self):
        self.client.force_authenticate(user=self.admin)
        url = f"{stock_url(self.elemento.pk)}historial/"
        self.assertEqual(self.client.post(url, {}, format="json").status_code, 405)
        self.client.force_authenticate(user=self.usuario)
        url = f"{mi_stock_url(self.elemento.pk)}historial/"
        self.assertEqual(self.client.post(url, {}, format="json").status_code, 405)

    def test_el_administrador_no_entra_al_historial_de_mi_stock(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(f"{mi_stock_url(self.elemento.pk)}historial/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(r.data["codigo"], CODIGO_NO_ES_PROVEEDOR)

    def test_sin_token_da_401(self):
        for url in (f"{stock_url(self.elemento.pk)}historial/", f"{mi_stock_url(self.elemento.pk)}historial/"):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)

from datetime import timedelta
from decimal import Decimal

from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import status

from apps.clientes.models import Cliente
from apps.proveedores.models import Proveedor, StockElemento

# Se importa el módulo y no la clase: así el runner no vuelve a correr los tests de la base.
from . import tests as base

LISTADOS = {
    "cotizaciones": "/api/cotizaciones/",
    "clientes": "/api/clientes/",
    "usuarios": "/api/usuarios/",
    "stock": "/api/stock/",
}
CLAVES = {"count", "next", "previous", "results"}
N = 12


class PaginacionTests(base.CotizacionBaseTest):
    """SGDE-116: los listados grandes responden paginados y con consultas constantes."""

    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.proveedor = Proveedor.objects.create(nombre="Proveedor P")
        for i in range(1, N + 1):
            self.crear_en_bd(fecha_evento=base.hoy() + timedelta(days=i))
            Cliente.objects.create(
                tipo=Cliente.NATURAL, nombre=f"Cliente {i:02d}", identificacion=f"9{i:09d}"
            )
            base.crear_usuario(f"usuario{i}@test.com", "cliente")
            StockElemento.objects.create(
                proveedor=self.proveedor, nombre_elemento=f"Elemento {i:02d}",
                cantidad=1, valor=Decimal("1000.00"),
            )

    def consultas(self, url, **params):
        with CaptureQueriesContext(connection) as capturadas:
            respuesta = self.client.get(url, params)
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK, url)
        return len(capturadas)

    def test_los_cuatro_listados_responden_count_next_previous_results(self):
        for nombre, url in LISTADOS.items():
            with self.subTest(listado=nombre):
                respuesta = self.client.get(url)
                self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
                datos = respuesta.json()
                self.assertEqual(set(datos), CLAVES)
                self.assertGreaterEqual(datos["count"], N)
                self.assertIsInstance(datos["results"], list)

    def test_page_size_fija_el_tamano_de_la_pagina(self):
        for nombre, url in LISTADOS.items():
            with self.subTest(listado=nombre):
                datos = self.client.get(url, {"page_size": 5}).json()
                self.assertEqual(len(datos["results"]), 5)
                self.assertIsNotNone(datos["next"])
                self.assertIsNone(datos["previous"])
                segunda = self.client.get(url, {"page_size": 5, "page": 2}).json()
                self.assertIsNotNone(segunda["previous"])
                ids_1 = {f["id"] for f in datos["results"]}
                ids_2 = {f["id"] for f in segunda["results"]}
                self.assertFalse(ids_1 & ids_2, "una página repite filas de la otra")

    def test_el_tamano_por_defecto_es_50(self):
        for i in range(51):
            StockElemento.objects.create(
                proveedor=self.proveedor, nombre_elemento=f"Extra {i:02d}",
                cantidad=1, valor=Decimal("1.00"),
            )
        datos = self.client.get(LISTADOS["stock"]).json()
        self.assertEqual(datos["count"], N + 51)
        self.assertEqual(len(datos["results"]), 50)
        self.assertIsNotNone(datos["next"])

    def test_las_consultas_no_dependen_del_tamano_de_pagina(self):
        for nombre, url in LISTADOS.items():
            with self.subTest(listado=nombre):
                pequena = self.consultas(url, page_size=2)
                grande = self.consultas(url, page_size=N)
                self.assertEqual(pequena, grande, f"{nombre}: las consultas crecen con la página")
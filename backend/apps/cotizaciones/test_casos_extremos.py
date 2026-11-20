from datetime import timedelta

from rest_framework import status

from .models import Cotizacion
from .tests import LISTA, CotizacionBaseTest, detalle, hoy


class CotizacionExtremoTests(CotizacionBaseTest):
    def setUp(self):
        self.client.force_authenticate(self.admin)

    def crear(self, **cambios):
        return self.client.post(LISTA, self.payload(**cambios), format="json")

    def test_una_cantidad_enorme_de_un_concepto_da_400_y_no_500(self):
        respuesta = self.crear(items=[{"concepto": self.almuerzo.pk, "cantidad": 10**12}])

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cantidad", respuesta.data["items"][0])

    def test_el_mismo_concepto_dos_veces_da_400_en_la_segunda_linea(self):
        respuesta = self.crear(items=[
            {"concepto": self.almuerzo.pk, "cantidad": 40},
            {"concepto": self.almuerzo.pk, "cantidad": 40},
        ])

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.data["items"][0], {})
        self.assertIn("concepto", respuesta.data["items"][1])

    def test_mas_de_cien_conceptos_da_400(self):
        respuesta = self.crear(items=[{"concepto": self.almuerzo.pk, "cantidad": 1}] * 101)

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("items", respuesta.data)

    def test_un_evento_a_mas_de_cinco_anios_da_400(self):
        respuesta = self.crear(fecha_evento="9999-12-31")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fecha_evento", respuesta.data)

    def test_una_fecha_imposible_da_400(self):
        self.assertEqual(self.crear(fecha_evento="2027-02-30").status_code, status.HTTP_400_BAD_REQUEST)

    def test_items_que_no_son_lista_dan_400(self):
        self.assertEqual(self.crear(items="almuerzo").status_code, status.HTTP_400_BAD_REQUEST)

    def test_un_motivo_de_anulacion_de_mas_de_mil_caracteres_da_400(self):
        creada = self.crear()
        self.assertEqual(creada.status_code, status.HTTP_201_CREATED)

        respuesta = self.client.post(f"{detalle(creada.data['id'])}anulacion/", {"motivo": "a" * 1001}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Cotizacion.objects.get(pk=creada.data["id"]).estado, "cotizado")

    def test_el_reporte_rechaza_un_rango_de_fechas_invertido(self):
        respuesta = self.client.get(
            "/api/reportes/ingresos-por-tipo-evento/",
            {"desde": str(hoy() + timedelta(days=10)), "hasta": str(hoy())},
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("hasta", respuesta.data)

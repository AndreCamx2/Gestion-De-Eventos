from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.sitios.models import Ciudad, Sitio
from apps.usuarios.models import Rol, Usuario

from .models import Concepto, HistorialPrecioConcepto

PASSWORD = "Clave-Segura-123"


def crear_usuario(username, codigo_rol):
    rol = Rol.objects.get(codigo=codigo_rol)
    return Usuario.objects.create_user(username=username, password=PASSWORD, rol=rol)


def detalle(pk):
    return f"/api/conceptos/{pk}/"


class EditarPrecioConceptoTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.cliente_user = crear_usuario("cliente@test.com", "cliente")
        cls.proveedor_user = crear_usuario("proveedor@test.com", "proveedor")
        sitio = Sitio.objects.create(nombre="Hotel Caribe", ciudad=Ciudad.objects.get(codigo="CTG"))
        cls.concepto = Concepto.objects.create(sitio=sitio, nombre="Silla Tiffany", precio=Decimal("1000.00"))

    def test_sin_token_recibe_401(self):
        for metodo in ("get", "put", "patch"):
            with self.subTest(metodo=metodo):
                r = getattr(self.client, metodo)(detalle(self.concepto.pk), {"precio": "1"}, format="json")
                self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cliente_y_proveedor_reciben_403_y_no_cambia_nada(self):
        for usuario in (self.cliente_user, self.proveedor_user):
            self.client.force_authenticate(user=usuario)
            with self.subTest(rol=usuario.rol.codigo):
                r = self.client.patch(detalle(self.concepto.pk), {"precio": "5"}, format="json")
                self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(self.client.get(f"{detalle(self.concepto.pk)}historial/").status_code, 403)
        self.concepto.refresh_from_db()
        self.assertEqual(self.concepto.precio, Decimal("1000.00"))
        self.assertFalse(HistorialPrecioConcepto.objects.exists())

    def test_admin_cambia_precio_y_queda_historial(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.patch(detalle(self.concepto.pk), {"precio": "1200.50"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.concepto.refresh_from_db()
        self.assertEqual(self.concepto.precio, Decimal("1200.50"))
        h = HistorialPrecioConcepto.objects.get()
        self.assertEqual(h.precio_anterior, Decimal("1000.00"))
        self.assertEqual(h.precio_nuevo, Decimal("1200.50"))
        self.assertEqual(h.modificado_por, self.admin)
        self.assertIsNotNone(h.fecha_modificacion)

    def test_put_completo_tambien_registra(self):
        self.client.force_authenticate(user=self.admin)
        cuerpo = {"sitio": self.concepto.sitio_id, "nombre": "Silla Tiffany", "precio": "900.00", "impuesto_pct": "19.00"}
        self.assertEqual(self.client.put(detalle(self.concepto.pk), cuerpo, format="json").status_code, 200)
        self.assertEqual(HistorialPrecioConcepto.objects.count(), 1)

    def test_si_el_precio_no_cambia_no_hay_historial(self):
        self.client.force_authenticate(user=self.admin)
        self.client.patch(detalle(self.concepto.pk), {"precio": "1000.00"}, format="json")
        self.client.patch(detalle(self.concepto.pk), {"activo": False}, format="json")
        self.assertFalse(HistorialPrecioConcepto.objects.exists())

    def test_precio_negativo_da_400(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.patch(detalle(self.concepto.pk), {"precio": "-1"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.concepto.refresh_from_db()
        self.assertEqual(self.concepto.precio, Decimal("1000.00"))

    def test_concepto_inexistente_da_404(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.patch(detalle(99999), {"precio": "1"}, format="json").status_code, 404)

    def test_no_existe_delete(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.delete(detalle(self.concepto.pk)).status_code, 405)

    def test_historial_devuelve_cambios_mas_recientes_primero(self):
        self.client.force_authenticate(user=self.admin)
        self.client.patch(detalle(self.concepto.pk), {"precio": "1100"}, format="json")
        self.client.patch(detalle(self.concepto.pk), {"precio": "1300"}, format="json")
        r = self.client.get(f"{detalle(self.concepto.pk)}historial/")
        self.assertEqual(r.status_code, 200)
        datos = r.json()
        self.assertEqual([d["precio_nuevo"] for d in datos], ["1300.00", "1100.00"])
        self.assertEqual(datos[0]["modificado_por"], "admin@test.com")
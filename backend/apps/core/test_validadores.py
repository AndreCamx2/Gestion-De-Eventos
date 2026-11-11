"""Reglas de los campos de texto y su uso en cada formulario del API (revisión de QA).

Antes: "123123123" pasaba como nombre de proveedor, "ffdsfs" como su identificación,
"12312312" como usuario y cualquier cosa como nombre de venue, salón o concepto.
"""
from decimal import Decimal

from django.test import SimpleTestCase
from rest_framework import serializers, status
from rest_framework.test import APITestCase

from apps.catalogo.models import Concepto
from apps.clientes.models import Empresa
from apps.proveedores.models import Proveedor, StockElemento
from apps.salones.models import Salon
from apps.sitios.models import Ciudad, Sitio
from apps.usuarios.models import Rol, Usuario

from . import validadores as v

PASSWORD = "Clave-Segura-123"


class ReglasTests(SimpleTestCase):
    def assertPasa(self, funcion, valor, esperado=None):
        self.assertEqual(funcion(valor), valor if esperado is None else esperado)

    def assertFalla(self, funcion, valor):
        with self.assertRaises(serializers.ValidationError, msg=repr(valor)):
            funcion(valor)

    def test_nombre_de_cosa_admite_numeros_pero_no_solo_numeros(self):
        for valor in ("Salón 2", "Coffee break x 50", "Hotel Caribe S.A.S.", "Silla Tiffany (blanca)"):
            self.assertPasa(v.validar_nombre_cosa, valor)
        self.assertPasa(v.validar_nombre_cosa, "  Salón   Barú ", "Salón Barú")
        for valor in ("123123123", "8888", "!!!", "a1", "Salón <b>"):
            self.assertFalla(v.validar_nombre_cosa, valor)

    def test_usuario_necesita_tres_letras(self):
        for valor in ("jvargas", "admin2", "ana.p", "hola@gmail.com"):
            self.assertPasa(v.validar_usuario, valor)
        for valor in ("12312312", "ab1", "a.b.1", "j vargas"):
            self.assertFalla(v.validar_usuario, valor)

    def test_identificacion_de_proveedor_es_cedula_o_nit(self):
        self.assertPasa(v.validar_identificacion_proveedor, "")
        self.assertPasa(v.validar_identificacion_proveedor, "1.047.338.221", "1047338221")
        self.assertPasa(v.validar_identificacion_proveedor, "900123456-8")
        for valor in ("ffdsfs", "12", "900123456-1", "ABC-123"):
            self.assertFalla(v.validar_identificacion_proveedor, valor)

    def test_contacto_es_un_nombre_o_un_telefono(self):
        self.assertPasa(v.validar_contacto, "")
        self.assertPasa(v.validar_contacto, "Carlos Pérez")
        self.assertPasa(v.validar_contacto, "Carlos 3001234567")
        self.assertPasa(v.validar_contacto, "300 123 4567", "3001234567")
        for valor in ("123", "@@", "x"):
            self.assertFalla(v.validar_contacto, valor)

    def test_razon_social_no_puede_ser_solo_numeros(self):
        self.assertPasa(v.validar_razon_social, "Eventos 360 S.A.S.")
        self.assertFalla(v.validar_razon_social, "12345")


class FormulariosTests(APITestCase):
    """Cada formulario rechaza el dato malo en su campo y acepta uno bueno."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_user(
            username="admin@test.com", password=PASSWORD, rol=Rol.objects.get(codigo="administrador")
        )
        cls.ciudad = Ciudad.objects.get(codigo="CTG")
        cls.sitio = Sitio.objects.create(nombre="Hotel Caribe", ciudad=cls.ciudad)
        cls.admin.sitios.add(cls.sitio)
        cls.salon = Salon.objects.create(sitio=cls.sitio, nombre="Salón Barú")
        cls.proveedor = Proveedor.objects.create(nombre="Sonido Caribe")

    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def revisar(self, url, malos, bueno, metodo="post"):
        """malos: {campo: valor} que deben dar 400 en ese campo; bueno: payload válido."""
        enviar = getattr(self.client, metodo)
        for campo, valor in malos.items():
            with self.subTest(url=url, campo=campo, valor=valor):
                r = enviar(url, {**bueno, campo: valor}, format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST, r.content)
                self.assertIn(campo, r.json())
        r = enviar(url, bueno, format="json")
        self.assertIn(r.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED), r.content)
        return r

    def test_usuarios(self):
        bueno = {
            "username": "lgomez", "first_name": "Laura", "last_name": "Gómez", "email": "laura@test.com",
            "password": PASSWORD, "rol": Rol.objects.get(codigo="proveedor").id, "sitios": [],
        }
        r = self.revisar(
            "/api/usuarios/",
            {"username": "12312312", "first_name": "123", "last_name": "Gómez 2"},
            bueno,
        )
        self.revisar(f"/api/usuarios/{r.json()['id']}/", {"first_name": "4567"}, {"first_name": "Ana"}, "patch")
        # Sin nombre ni apellido no se crea.
        sin_nombre = {k: v for k, v in bueno.items() if k not in ("first_name", "last_name")}
        r = self.client.post("/api/usuarios/", {**sin_nombre, "username": "otro"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("first_name", r.json())

    def test_usuario_viejo_que_no_cumple_se_edita_sin_cambiar_su_usuario(self):
        viejo = Usuario.objects.create_user(
            username="12312312", password=PASSWORD, rol=Rol.objects.get(codigo="proveedor")
        )
        r = self.client.patch(
            f"/api/usuarios/{viejo.pk}/", {"username": "12312312", "first_name": "Luis"}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.content)

    def test_clientes(self):
        self.revisar(
            "/api/clientes/",
            {"nombre": "123123", "identificacion": "abc123", "telefono": "12ab"},
            {"tipo": "natural", "nombre": "Ana Pérez", "identificacion": "1047000111", "telefono": "300 111 2233"},
        )

    def test_empresas(self):
        self.revisar(
            "/api/empresas/",
            {"razon_social": "12345", "identificacion": "ffdsfs", "contacto": "123"},
            {"razon_social": "Eventos S.A.S.", "identificacion": "900123456-8", "contacto": "Carlos Pérez",
             "ciudad": self.ciudad.id},
        )
        self.assertTrue(Empresa.objects.filter(razon_social="Eventos S.A.S.").exists())

    def test_proveedores(self):
        self.revisar(
            "/api/proveedores/",
            {"nombre": "123123123", "identificacion": "ffdsfs", "contacto": "123"},
            {"nombre": "Luces del Mar", "identificacion": "900123456-8", "contacto": "300 123 4567"},
        )
        self.assertEqual(Proveedor.objects.get(nombre="Luces del Mar").contacto, "3001234567")

    def test_stock(self):
        self.revisar(
            "/api/stock/",
            {"nombre_elemento": "8888"},
            {"proveedor": self.proveedor.id, "nombre_elemento": "Silla Tiffany", "cantidad": 10, "valor": "5000"},
        )

    def test_stock_viejo_con_nombre_malo_se_puede_editar(self):
        viejo = StockElemento.objects.create(proveedor=self.proveedor, nombre_elemento="8888", cantidad=1, valor=1)
        r = self.client.patch(f"/api/stock/{viejo.pk}/", {"nombre_elemento": "8888", "cantidad": 3}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.content)

    def test_venues_salones_y_conceptos(self):
        self.revisar("/api/sitios/", {"nombre": "123"}, {"nombre": "Finca La Ceiba 2", "ciudad": self.ciudad.id})
        self.revisar("/api/salones/", {"nombre": "!!!"}, {"sitio": self.sitio.id, "nombre": "Salón 3"})
        self.revisar(
            "/api/conceptos/",
            {"nombre": "999"},
            {"sitio": self.sitio.id, "nombre": "Coffee break x 50", "precio": "45000", "impuesto_pct": "8"},
        )
        self.assertTrue(Concepto.objects.filter(nombre="Coffee break x 50", precio=Decimal("45000")).exists())

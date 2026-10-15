"""El proveedor administra su propio stock (SGDE-30).

"Mi stock" es la excepción a EsAdministrador: es del rol proveedor (EsProveedor).
También cubre cómo el administrador vincula el usuario de acceso de un proveedor.
El 401/403 de /api/proveedores/<id>/ está en ENDPOINTS_ADMIN_DETALLE (apps/usuarios/tests.py).
"""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.usuarios.models import Rol, Usuario
from apps.usuarios.permissions import CODIGO_NO_ES_PROVEEDOR, CODIGO_PROVEEDOR_SIN_VINCULAR

from .models import Proveedor, StockElemento

PASSWORD = "Clave-Segura-123"
MI_STOCK = "/api/mi-stock/"


def crear_usuario(username, codigo_rol):
    return Usuario.objects.create_user(
        username=username, password=PASSWORD, rol=Rol.objects.get(codigo=codigo_rol)
    )


def mi_stock_url(pk):
    return f"{MI_STOCK}{pk}/"


class MiStockTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = crear_usuario("sonido@test.com", "proveedor")
        cls.proveedor = Proveedor.objects.create(nombre="Sonido Caribe", usuario=cls.usuario)
        cls.otro = Proveedor.objects.create(nombre="Luces del Mar")

    def setUp(self):
        self.client.force_authenticate(user=self.usuario)
        self.mio = StockElemento.objects.create(
            proveedor=self.proveedor, nombre_elemento="Micrófono", cantidad=10, valor=Decimal("50000")
        )
        self.ajeno = StockElemento.objects.create(
            proveedor=self.otro, nombre_elemento="Reflector", cantidad=4, valor=Decimal("90000")
        )

    def crear(self, datos):
        return self.client.post(MI_STOCK, datos, format="json")

    def editar(self, pk, datos):
        return self.client.patch(mi_stock_url(pk), datos, format="json")

    def test_lista_solo_lo_suyo(self):
        r = self.client.get(MI_STOCK)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual([e["id"] for e in r.data], [self.mio.pk])

    def test_crea_en_su_proveedor_aunque_mande_otro(self):
        r = self.crear({"nombre_elemento": "Consola", "cantidad": 2, "valor": "300000", "proveedor": self.otro.pk})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(r.data["proveedor"], self.proveedor.pk)
        self.assertEqual(StockElemento.objects.get(pk=r.data["id"]).proveedor, self.proveedor)

    def test_crear_un_nombre_repetido_da_400(self):
        r = self.crear({"nombre_elemento": "Micrófono", "cantidad": 1, "valor": "1"})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["nombre_elemento"], ["Ya tienes un elemento con este nombre: edítalo."])

    def test_otro_proveedor_puede_tener_el_mismo_nombre(self):
        r = self.crear({"nombre_elemento": "Reflector", "cantidad": 1, "valor": "1"})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)

    def test_crear_sin_datos_da_400(self):
        r = self.crear({})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(r.data), {"nombre_elemento", "valor"})

    def test_edita_cantidad_y_valor(self):
        r = self.editar(self.mio.pk, {"cantidad": 0, "valor": "65000.50"})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.mio.refresh_from_db()
        self.assertEqual((self.mio.cantidad, self.mio.valor), (0, Decimal("65000.50")))

    def test_editar_el_nombre_da_400_como_sgde_98(self):
        r = self.editar(self.mio.pk, {"nombre_elemento": "Parlante"})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["nombre_elemento"], ["No se puede cambiar: crea un elemento nuevo."])

    def test_editar_no_cambia_el_proveedor(self):
        r = self.editar(self.mio.pk, {"proveedor": self.otro.pk, "cantidad": 3})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.mio.refresh_from_db()
        self.assertEqual((self.mio.proveedor, self.mio.cantidad), (self.proveedor, 3))

    def test_negativos_dan_400(self):
        for datos in ({"cantidad": -1}, {"valor": "-1"}):
            with self.subTest(datos=datos):
                self.assertEqual(self.editar(self.mio.pk, datos).status_code, status.HTTP_400_BAD_REQUEST)

    def test_el_stock_de_otro_da_404(self):
        self.assertEqual(self.client.get(mi_stock_url(self.ajeno.pk)).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.editar(self.ajeno.pk, {"cantidad": 0}).status_code, status.HTTP_404_NOT_FOUND)
        self.ajeno.refresh_from_db()
        self.assertEqual(self.ajeno.cantidad, 4)

    def test_sin_put_ni_delete(self):
        url = mi_stock_url(self.mio.pk)
        self.assertEqual(self.client.put(url, {}, format="json").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class MiStockAccesoTests(APITestCase):
    """Quién entra a Mi stock. El 403 trae un `codigo` para que la pantalla decida
    por él y no por el texto del mensaje."""

    URLS = [(MI_STOCK, ["get", "post"]), (mi_stock_url(1), ["get", "patch"])]

    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.cliente = crear_usuario("cliente@test.com", "cliente")
        cls.sin_vincular = crear_usuario("suelto@test.com", "proveedor")

    def peticiones(self):
        for url, metodos in self.URLS:
            for metodo in metodos:
                yield url, metodo, getattr(self.client, metodo)(url, {}, format="json")

    def test_sin_token_da_401(self):
        for url, metodo, r in self.peticiones():
            with self.subTest(url=url, metodo=metodo):
                self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_administrador_y_cliente_dan_403_con_codigo(self):
        for usuario in (self.admin, self.cliente):
            self.client.force_authenticate(user=usuario)
            for url, metodo, r in self.peticiones():
                with self.subTest(rol=usuario.rol.codigo, url=url, metodo=metodo):
                    self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
                    self.assertEqual(r.data["codigo"], CODIGO_NO_ES_PROVEEDOR)
                    self.assertEqual(r.data["detail"], "Solo los proveedores pueden realizar esta acción.")

    def test_proveedor_sin_vincular_da_403_con_codigo(self):
        self.client.force_authenticate(user=self.sin_vincular)
        for url, metodo, r in self.peticiones():
            with self.subTest(url=url, metodo=metodo):
                self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(r.data["codigo"], CODIGO_PROVEEDOR_SIN_VINCULAR)
                self.assertIn("no está vinculado a un proveedor", r.data["detail"])

    def test_el_proveedor_sigue_sin_entrar_al_stock_del_administrador(self):
        usuario = crear_usuario("vinculado@test.com", "proveedor")
        Proveedor.objects.create(nombre="Sonido Caribe", usuario=usuario)
        self.client.force_authenticate(user=usuario)
        for url in ("/api/stock/", "/api/proveedores/", "/api/stock/comparar/"):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)


class VincularUsuarioTests(APITestCase):
    """El administrador vincula o desvincula el usuario de acceso de un proveedor."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.usuario = crear_usuario("sonido@test.com", "proveedor")
        cls.cliente = crear_usuario("cliente@test.com", "cliente")

    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.proveedor = Proveedor.objects.create(nombre="Sonido Caribe")
        self.otro = Proveedor.objects.create(nombre="Luces del Mar")

    def vincular(self, proveedor, usuario):
        return self.client.patch(f"/api/proveedores/{proveedor.pk}/", {"usuario": usuario}, format="json")

    def test_vincula_y_desvincula(self):
        r = self.vincular(self.proveedor, self.usuario.pk)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual((r.data["usuario"], r.data["usuario_nombre"]), (self.usuario.pk, "sonido@test.com"))

        r = self.vincular(self.proveedor, None)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual((r.data["usuario"], r.data["usuario_nombre"]), (None, None))
        self.proveedor.refresh_from_db()
        self.assertIsNone(self.proveedor.usuario)

    def test_varios_proveedores_sin_usuario_no_chocan(self):
        # Hay otro proveedor sin usuario: desvincular no debe chocar con él.
        r = self.vincular(self.proveedor, None)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)

    def test_volver_a_mandar_el_mismo_usuario_no_es_un_choque(self):
        self.vincular(self.proveedor, self.usuario.pk)
        r = self.vincular(self.proveedor, self.usuario.pk)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)

    def test_usuario_que_no_es_proveedor_da_400(self):
        for usuario in (self.cliente, self.admin):
            with self.subTest(rol=usuario.rol.codigo):
                r = self.vincular(self.proveedor, usuario.pk)
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.data["usuario"], ["Solo se puede vincular un usuario con rol proveedor."])

    def test_el_mismo_usuario_en_dos_proveedores_da_400(self):
        self.vincular(self.proveedor, self.usuario.pk)
        r = self.vincular(self.otro, self.usuario.pk)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["usuario"], ["Este usuario ya está vinculado a otro proveedor."])

    def test_crear_con_usuario(self):
        r = self.client.post("/api/proveedores/", {"nombre": "Mobiliario", "usuario": self.usuario.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(Proveedor.objects.get(pk=r.data["id"]).usuario, self.usuario)

    def test_crear_con_un_usuario_ya_vinculado_da_400(self):
        self.vincular(self.proveedor, self.usuario.pk)
        r = self.client.post("/api/proveedores/", {"nombre": "Mobiliario", "usuario": self.usuario.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["usuario"], ["Este usuario ya está vinculado a otro proveedor."])

    def test_listado_trae_usuario_y_nombre(self):
        self.vincular(self.proveedor, self.usuario.pk)
        datos = {p["id"]: p for p in self.client.get("/api/proveedores/").data}
        self.assertEqual(datos[self.proveedor.pk]["usuario_nombre"], "sonido@test.com")
        self.assertEqual((datos[self.otro.pk]["usuario"], datos[self.otro.pk]["usuario_nombre"]), (None, None))

    def test_sin_put_ni_delete(self):
        url = f"/api/proveedores/{self.proveedor.pk}/"
        self.assertEqual(self.client.put(url, {}, format="json").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_proveedor_inexistente_da_404(self):
        r = self.client.patch("/api/proveedores/999999/", {"usuario": None}, format="json")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

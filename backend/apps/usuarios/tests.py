from rest_framework import status
from rest_framework.test import APITestCase

from .models import Rol, Usuario

PASSWORD = "Clave-Segura-123"

# Endpoints de administración: solo el rol "administrador" puede usarlos.
ENDPOINTS_ADMIN = [
    "/api/clientes/",
    "/api/empresas/",
    "/api/sitios/",
    "/api/salones/",
    "/api/montajes/",
    "/api/salon-montajes/",
]


def crear_usuario(username, codigo_rol):
    rol = Rol.objects.get(codigo=codigo_rol)
    return Usuario.objects.create_user(username=username, password=PASSWORD, rol=rol)


class MatrizAccesoPorRolTests(APITestCase):
    """SEG-001: cliente y proveedor no pueden usar los endpoints de administración."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.cliente = crear_usuario("cliente@test.com", "cliente")
        cls.proveedor = crear_usuario("proveedor@test.com", "proveedor")

    def test_sin_token_recibe_401(self):
        for url in ENDPOINTS_ADMIN + ["/api/usuarios/registro/"]:
            with self.subTest(url=url, metodo="GET"):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)
            with self.subTest(url=url, metodo="POST"):
                self.assertEqual(self.client.post(url, {}, format="json").status_code,
                                 status.HTTP_401_UNAUTHORIZED)

    def test_cliente_y_proveedor_reciben_403(self):
        for usuario in (self.cliente, self.proveedor):
            self.client.force_authenticate(user=usuario)
            for url in ENDPOINTS_ADMIN:
                with self.subTest(rol=usuario.rol.codigo, url=url, metodo="GET"):
                    self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)
                with self.subTest(rol=usuario.rol.codigo, url=url, metodo="POST"):
                    self.assertEqual(self.client.post(url, {}, format="json").status_code,
                                     status.HTTP_403_FORBIDDEN)

    def test_administrador_pasa_el_permiso(self):
        """GET responde 200; POST vacío llega a la validación (400), no es rechazado (403)."""
        self.client.force_authenticate(user=self.admin)
        for url in ENDPOINTS_ADMIN:
            with self.subTest(url=url, metodo="GET"):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
            with self.subTest(url=url, metodo="POST"):
                self.assertEqual(self.client.post(url, {}, format="json").status_code,
                                 status.HTTP_400_BAD_REQUEST)

    def test_usuarios_me_sigue_abierto_a_cualquier_autenticado(self):
        for usuario in (self.admin, self.cliente, self.proveedor):
            self.client.force_authenticate(user=usuario)
            with self.subTest(rol=usuario.rol.codigo):
                self.assertEqual(self.client.get("/api/usuarios/me/").status_code, status.HTTP_200_OK)


class RegistroUsuariosInternosTests(APITestCase):
    """SEG-004: solo un administrador puede crear usuarios internos y fijar su rol."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.cliente = crear_usuario("cliente@test.com", "cliente")
        cls.rol_admin = Rol.objects.get(codigo="administrador")
        cls.rol_proveedor = Rol.objects.get(codigo="proveedor")

    def payload(self, rol):
        return {"username": "nuevo@test.com", "email": "nuevo@test.com",
                "password": PASSWORD, "rol": rol.id, "sitios": []}

    def test_cliente_no_puede_crear_usuarios_ni_fijar_rol(self):
        self.client.force_authenticate(user=self.cliente)
        antes = Usuario.objects.count()
        respuesta = self.client.post("/api/usuarios/registro/", self.payload(self.rol_admin), format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Usuario.objects.count(), antes)

    def test_administrador_puede_crear_usuario_con_rol(self):
        self.client.force_authenticate(user=self.admin)
        respuesta = self.client.post("/api/usuarios/registro/", self.payload(self.rol_proveedor), format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Usuario.objects.get(username="nuevo@test.com").rol, self.rol_proveedor)


class CadenaEscaladaSEG004Tests(APITestCase):
    """SEG-004 de punta a punta, sin credenciales previas ni force_authenticate."""

    REGISTRO = {"tipo": "natural", "nombre": "Atacante", "identificacion": "999",
                "email": "atacante@test.com", "ciudad": "CTG", "password": PASSWORD}

    def test_la_cadena_completa_ya_no_produce_un_administrador(self):
        rol_admin = Rol.objects.get(codigo="administrador")
        self.assertFalse(Usuario.objects.filter(rol=rol_admin).exists())

        # (a) registro público: cualquiera crea una cuenta
        r = self.client.post("/api/registro/", self.REGISTRO, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

        # (b) login real con esa cuenta
        r = self.client.post("/api/token/", {"username": "atacante@test.com", "password": PASSWORD},
                             format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

        # (c) intento de crear un administrador con ese token
        r = self.client.post("/api/usuarios/registro/",
                             {"username": "root@test.com", "email": "root@test.com",
                              "password": PASSWORD, "rol": rol_admin.id, "sitios": []},
                             format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Usuario.objects.filter(rol=rol_admin).exists())

    def test_registro_publico_ignora_un_rol_enviado_en_el_payload(self):
        """Variante en un solo paso y sin token: el rol del payload no debe tener efecto."""
        rol_admin = Rol.objects.get(codigo="administrador")
        datos = dict(self.REGISTRO, rol=rol_admin.id, sitios=[1])
        r = self.client.post("/api/registro/", datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Usuario.objects.get(username="atacante@test.com").rol.codigo, "cliente")
        self.assertFalse(Usuario.objects.filter(rol=rol_admin).exists())

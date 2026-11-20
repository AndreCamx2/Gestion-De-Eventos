from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.pruebas import sin_limite_de_intentos
from apps.proveedores.models import Proveedor

from .models import Rol, Usuario
from .serializers import MSG_CORREO_REPETIDO, MSG_USUARIO_REPETIDO

PASSWORD = "Clave-Segura-123"


def crear_usuario(username, codigo_rol, email=""):
    return Usuario.objects.create_user(
        username, email=email, password=PASSWORD, rol=Rol.objects.get(codigo=codigo_rol)
    )


class RegistrarUsuarioExtremoTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@sgde.co", "administrador", email="admin@sgde.co")
        cls.rol_proveedor = Rol.objects.get(codigo="proveedor")

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def registrar(self, **datos):
        cuerpo = {"username": "luisa", "email": "luisa@sgde.co", "password": PASSWORD, "rol": self.rol_proveedor.pk}
        return self.client.post("/api/usuarios/registro/", {**cuerpo, **datos}, format="json")

    def test_no_repite_un_usuario_cambiando_mayusculas(self):
        respuesta = self.registrar(username="ADMIN@SGDE.CO", email="")

        self.assertEqual(respuesta.data["username"], [MSG_USUARIO_REPETIDO])

    def test_no_repite_un_correo_cambiando_mayusculas(self):
        respuesta = self.registrar(email="Admin@Sgde.co")

        self.assertEqual(respuesta.data["email"], [MSG_CORREO_REPETIDO])

    def test_el_correo_se_guarda_en_minuscula(self):
        respuesta = self.registrar(email="Luisa@SGDE.co")

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Usuario.objects.get(username="luisa").email, "luisa@sgde.co")

    def test_una_contrasena_enorme_da_400_sin_calcular_el_hash(self):
        respuesta = self.registrar(password="x" * 100_000)

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Usuario.objects.filter(username="luisa").exists())

    def test_un_usuario_de_mas_de_150_caracteres_da_400(self):
        self.assertEqual(self.registrar(username="a" * 151).status_code, status.HTTP_400_BAD_REQUEST)

    def test_nombre_con_numeros_da_400_al_editar(self):
        usuario = crear_usuario("pedro", "proveedor")

        respuesta = self.client.patch(f"/api/usuarios/{usuario.pk}/", {"first_name": "Pedro2"}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("first_name", respuesta.data)


@sin_limite_de_intentos
class PerfilExtremoTests(APITestCase):
    def setUp(self):
        self.usuario = crear_usuario("prov@sgde.co", "proveedor", email="prov@sgde.co")
        Proveedor.objects.create(nombre="Sonido Caribe", usuario=self.usuario)
        self.client.force_authenticate(self.usuario)

    def test_un_correo_nuevo_de_mas_de_150_caracteres_da_400_y_no_500(self):
        respuesta = self.client.post(
            "/api/mi-perfil/correo/", {"password_actual": PASSWORD, "correo_nuevo": f"{'z' * 150}@sgde.co"},
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("correo_nuevo", respuesta.data)

    def test_una_contrasena_nueva_enorme_da_400(self):
        respuesta = self.client.post(
            "/api/mi-perfil/contrasena/", {"password_actual": PASSWORD, "password_nueva": "x" * 100_000},
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password_nueva", respuesta.data)


@sin_limite_de_intentos
class LoginSinMayusculasTests(APITestCase):
    def test_entra_aunque_escriba_el_usuario_con_otras_mayusculas(self):
        crear_usuario("ana@sgde.co", "administrador")

        respuesta = self.client.post("/api/token/", {"username": "ANA@sgde.co", "password": PASSWORD}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)

    def test_si_dos_usuarios_viejos_solo_cambian_en_mayusculas_exige_el_exacto(self):
        crear_usuario("ana@sgde.co", "administrador")
        crear_usuario("Ana@sgde.co", "administrador")

        ambiguo = self.client.post("/api/token/", {"username": "ANA@SGDE.CO", "password": PASSWORD}, format="json")
        exacto = self.client.post("/api/token/", {"username": "Ana@sgde.co", "password": PASSWORD}, format="json")

        self.assertEqual(ambiguo.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(exacto.status_code, status.HTTP_200_OK)

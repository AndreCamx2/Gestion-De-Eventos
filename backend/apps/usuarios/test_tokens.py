"""SGDE-86: duración de los tokens JWT y renovación con /api/token/refresh/.
SGDE-92: logout con lista negra y rotación del refresh con tope de duración."""
import os
from datetime import timedelta
from io import StringIO
from unittest import mock

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from config.settings import entero_positivo_entorno

from .models import Rol, Usuario

PASSWORD = "Clave-Segura-123"
URL_TOKEN = "/api/token/"
URL_REFRESH = "/api/token/refresh/"
URL_LOGOUT = "/api/token/logout/"
URL_ME = "/api/usuarios/me/"


def crear_admin():
    rol = Rol.objects.get(codigo="administrador")
    return Usuario.objects.create_user(username="admin-tokens@test.com", password=PASSWORD, rol=rol)


class RenovacionDeTokenTests(APITestCase):
    """El frontend renueva el acceso con el refresh: así la sesión no vence a mitad del trabajo."""

    @classmethod
    def setUpTestData(cls):
        cls.usuario = crear_admin()

    def test_refresh_valido_entrega_un_access_que_funciona(self):
        refresh = RefreshToken.for_user(self.usuario)

        respuesta = self.client.post(URL_REFRESH, {"refresh": str(refresh)}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertIn("access", respuesta.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {respuesta.data['access']}")
        self.assertEqual(self.client.get(URL_ME).status_code, status.HTTP_200_OK)

    def test_refresh_invalido_responde_401(self):
        respuesta = self.client.post(URL_REFRESH, {"refresh": "esto-no-es-un-token"}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_un_access_como_refresh_responde_401(self):
        # El endpoint exige un token de tipo "refresh", no cualquier JWT firmado.
        access = AccessToken.for_user(self.usuario)

        respuesta = self.client.post(URL_REFRESH, {"refresh": str(access)}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_vencido_da_401_y_se_recupera_con_el_refresh(self):
        # Mismo camino que sigue el frontend: 401 → /token/refresh/ → repetir la petición.
        vencido = AccessToken.for_user(self.usuario)
        vencido.set_exp(lifetime=-timedelta(seconds=1))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {vencido}")
        self.assertEqual(self.client.get(URL_ME).status_code, status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(self.usuario)
        nuevo = self.client.post(URL_REFRESH, {"refresh": str(refresh)}, format="json").data["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {nuevo}")
        self.assertEqual(self.client.get(URL_ME).status_code, status.HTTP_200_OK)


class DuracionDeTokensTests(APITestCase):
    """Los tokens que entrega el login duran lo que dice SIMPLE_JWT en settings."""

    @classmethod
    def setUpTestData(cls):
        cls.usuario = crear_admin()

    def setUp(self):
        respuesta = self.client.post(
            URL_TOKEN, {"username": self.usuario.username, "password": PASSWORD}, format="json"
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.tokens = respuesta.data

    def test_el_access_dura_lo_configurado(self):
        payload = AccessToken(self.tokens["access"]).payload

        duracion = timedelta(seconds=payload["exp"] - payload["iat"])

        self.assertEqual(duracion, settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"])

    def test_el_refresh_dura_lo_configurado(self):
        payload = RefreshToken(self.tokens["refresh"]).payload

        duracion = timedelta(seconds=payload["exp"] - payload["iat"])

        self.assertEqual(duracion, settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"])

    def test_el_access_ya_no_dura_5_minutos(self):
        # El valor por defecto de simplejwt (5 min) era la causa del problema.
        self.assertGreater(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"], timedelta(minutes=5))


class EnteroPositivoEntornoTests(SimpleTestCase):
    """Lectura de JWT_ACCESS_MINUTES / JWT_REFRESH_HOURS desde el entorno."""

    def test_sin_variable_usa_el_valor_por_defecto(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("JWT_PRUEBA", None)
            self.assertEqual(entero_positivo_entorno("JWT_PRUEBA", 30), 30)

    def test_variable_vacia_usa_el_valor_por_defecto(self):
        with mock.patch.dict(os.environ, {"JWT_PRUEBA": "  "}):
            self.assertEqual(entero_positivo_entorno("JWT_PRUEBA", 12), 12)

    def test_lee_el_valor_de_la_variable(self):
        with mock.patch.dict(os.environ, {"JWT_PRUEBA": "1"}):
            self.assertEqual(entero_positivo_entorno("JWT_PRUEBA", 30), 1)

    def test_valores_invalidos_no_dejan_arrancar(self):
        for valor in ["abc", "0", "-5", "1.5"]:
            with self.subTest(valor=valor), mock.patch.dict(os.environ, {"JWT_PRUEBA": valor}):
                with self.assertRaises(ImproperlyConfigured):
                    entero_positivo_entorno("JWT_PRUEBA", 30)


class LoginBaseTest(APITestCase):
    """Entra con /api/token/ como el frontend: el refresh queda registrado en la lista de emitidos."""

    @classmethod
    def setUpTestData(cls):
        cls.usuario = crear_admin()

    def entrar(self):
        respuesta = self.client.post(
            URL_TOKEN, {"username": self.usuario.username, "password": PASSWORD}, format="json"
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        return respuesta.data

    def renovar(self, refresh):
        return self.client.post(URL_REFRESH, {"refresh": refresh}, format="json")

    def cerrar_sesion(self, refresh):
        return self.client.post(URL_LOGOUT, {"refresh": refresh}, format="json")


class LogoutTests(LoginBaseTest):
    """SGDE-92: al cerrar sesión, el refresh deja de servir en el servidor."""

    def test_despues_del_logout_el_refresh_da_401(self):
        refresh = self.entrar()["refresh"]

        respuesta = self.cerrar_sesion(refresh)

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertTrue(BlacklistedToken.objects.filter(token__token=refresh).exists())
        self.assertEqual(self.renovar(refresh).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_funciona_sin_access_y_con_un_access_vencido(self):
        # Sin cabecera Authorization.
        self.assertEqual(self.cerrar_sesion(self.entrar()["refresh"]).status_code, status.HTTP_200_OK)

        # Con un access vencido en la cabecera: el endpoint no autentica, no lo mira.
        vencido = AccessToken.for_user(self.usuario)
        vencido.set_exp(lifetime=-timedelta(seconds=1))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {vencido}")
        self.assertEqual(self.cerrar_sesion(self.entrar()["refresh"]).status_code, status.HTTP_200_OK)

    def test_refresh_ya_invalidado_basura_o_access_responde_401_sin_500(self):
        tokens = self.entrar()
        self.assertEqual(self.cerrar_sesion(tokens["refresh"]).status_code, status.HTTP_200_OK)

        casos = {
            "ya invalidado": tokens["refresh"],
            "basura": "esto-no-es-un-token",
            "un access en vez del refresh": tokens["access"],
        }
        for nombre, valor in casos.items():
            with self.subTest(caso=nombre):
                self.assertEqual(self.cerrar_sesion(valor).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sin_el_campo_refresh_responde_400(self):
        respuesta = self.client.post(URL_LOGOUT, {}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("refresh", respuesta.data)


class RotacionTests(LoginBaseTest):
    """SGDE-92: cada renovación entrega un refresh nuevo e invalida el anterior."""

    def test_el_viejo_deja_de_servir_y_el_nuevo_si(self):
        viejo = self.entrar()["refresh"]

        respuesta = self.renovar(viejo)

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        nuevo = respuesta.data["refresh"]
        self.assertNotEqual(nuevo, viejo)
        self.assertEqual(self.renovar(viejo).status_code, status.HTTP_401_UNAUTHORIZED)

        otra = self.renovar(nuevo)
        self.assertEqual(otra.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {otra.data['access']}")
        self.assertEqual(self.client.get(URL_ME).status_code, status.HTTP_200_OK)

    def test_el_refresh_rotado_conserva_el_vencimiento_del_login(self):
        # Tope de SGDE-86: la sesión termina JWT_REFRESH_HOURS después del login,
        # aunque se renueve muchas veces.
        refresh = self.entrar()["refresh"]
        original = RefreshToken(refresh).payload

        # Dos renovaciones seguidas: ninguna alarga el vencimiento.
        for _ in range(2):
            refresh = self.renovar(refresh).data["refresh"]
            nuevo = RefreshToken(refresh).payload
            self.assertEqual(nuevo["exp"], original["exp"])
            self.assertNotEqual(nuevo["jti"], original["jti"])
        # El registro de emitidos también vence a la hora original (lo usa flushexpiredtokens).
        registro = OutstandingToken.objects.get(jti=nuevo["jti"])
        self.assertEqual(int(registro.expires_at.timestamp()), original["exp"])

    def test_el_refresh_rotado_se_puede_invalidar_con_logout(self):
        nuevo = self.renovar(self.entrar()["refresh"]).data["refresh"]

        self.assertEqual(self.cerrar_sesion(nuevo).status_code, status.HTTP_200_OK)
        self.assertEqual(self.renovar(nuevo).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_usuario_borrado_o_inactivo_da_401_y_no_500(self):
        refresh = self.entrar()["refresh"]
        self.usuario.is_active = False
        self.usuario.save(update_fields=["is_active"])
        self.assertEqual(self.renovar(refresh).status_code, status.HTTP_401_UNAUTHORIZED)

        rol = Rol.objects.get(codigo="proveedor")
        temporal = Usuario.objects.create_user(username="temporal@test.com", password=PASSWORD, rol=rol)
        refresh_temporal = str(RefreshToken.for_user(temporal))
        temporal.delete()
        self.assertEqual(self.renovar(refresh_temporal).status_code, status.HTTP_401_UNAUTHORIZED)


class LimpiezaListaNegraTests(LoginBaseTest):
    def test_flushexpiredtokens_borra_solo_los_vencidos(self):
        vigente = self.entrar()["refresh"]
        self.cerrar_sesion(vigente)
        vencido = OutstandingToken.objects.create(
            user=self.usuario, jti="jti-vencido-de-prueba", token="no-importa",
            created_at=timezone.now() - timedelta(days=2), expires_at=timezone.now() - timedelta(days=1),
        )

        call_command("flushexpiredtokens", stdout=StringIO())

        self.assertFalse(OutstandingToken.objects.filter(pk=vencido.pk).exists())
        self.assertTrue(BlacklistedToken.objects.filter(token__token=vigente).exists())

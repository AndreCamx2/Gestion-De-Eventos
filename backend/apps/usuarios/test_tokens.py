"""SGDE-86: duración de los tokens JWT y renovación con /api/token/refresh/."""
import os
from datetime import timedelta
from unittest import mock

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from config.settings import entero_positivo_entorno

from .models import Rol, Usuario

PASSWORD = "Clave-Segura-123"
URL_TOKEN = "/api/token/"
URL_REFRESH = "/api/token/refresh/"
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

"""SGDE-112: límite de intentos por IP en login, renovación del token y registro público.

Cada clase fija una tasa baja con override_settings y limpia la caché, que es
donde DRF cuenta los intentos.
"""
import os

from django.conf import settings
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.clientes.models import Cliente
from apps.core.pruebas import sin_limite_de_intentos

from .limites import MSG_MUCHOS_INTENTOS
from .models import Rol, Usuario

PASSWORD = "Clave-Segura-123"
URL_TOKEN = "/api/token/"
URL_REFRESH = "/api/token/refresh/"
URL_REGISTRO = "/api/registro/"


def con_tasas(**tasas):
    """override_settings con las tasas indicadas y el resto de REST_FRAMEWORK igual."""
    actuales = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
    return override_settings(
        REST_FRAMEWORK={**settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {**actuales, **tasas}}
    )


class LimpiarConteo(APITestCase):
    def setUp(self):
        cache.clear()


def crear_usuario():
    rol = Rol.objects.get(codigo="administrador")
    return Usuario.objects.create_user(username="ana@test.com", email="ana@test.com", password=PASSWORD, rol=rol)


@con_tasas(login="5/min")
class LimiteLoginTests(LimpiarConteo):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = crear_usuario()

    def entrar(self, password, **extra):
        return self.client.post(URL_TOKEN, {"username": "ana@test.com", "password": password}, format="json", **extra)

    def test_el_sexto_intento_seguido_da_429(self):
        for _ in range(5):
            self.assertEqual(self.entrar("clave-mala").status_code, status.HTTP_401_UNAUTHORIZED)

        respuesta = self.entrar("clave-mala")

        self.assertEqual(respuesta.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn(MSG_MUCHOS_INTENTOS, respuesta.data["detail"])

    def test_pasado_el_limite_tampoco_entra_con_la_clave_correcta(self):
        for _ in range(5):
            self.entrar("clave-mala")

        self.assertEqual(self.entrar(PASSWORD).status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_dentro_del_limite_el_login_funciona(self):
        respuesta = self.entrar(PASSWORD)

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertIn("access", respuesta.data)

    def test_el_limite_es_por_ip(self):
        for _ in range(6):
            self.entrar("clave-mala", REMOTE_ADDR="10.0.0.1")

        respuesta = self.entrar(PASSWORD, REMOTE_ADDR="10.0.0.2")

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)

    def test_cambiar_x_forwarded_for_no_salta_el_limite(self):
        # Sin proxy delante (NUM_PROXIES=0) la IP es REMOTE_ADDR: un encabezado
        # inventado distinto en cada intento no cuenta como otro cliente.
        with self.settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, "NUM_PROXIES": 0}):
            for n in range(5):
                self.entrar("clave-mala", HTTP_X_FORWARDED_FOR=f"1.2.3.{n}")

            respuesta = self.entrar("clave-mala", HTTP_X_FORWARDED_FOR="9.9.9.9")

        self.assertEqual(respuesta.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_detras_de_un_proxy_cuenta_la_ip_que_agrega_el_proxy(self):
        # Con un proxy (Render), el cliente puede inventar lo que va antes de la
        # última IP, pero la última la pone el proxy y es la que se cuenta.
        with self.settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, "NUM_PROXIES": 1}):
            for n in range(5):
                self.entrar("clave-mala", HTTP_X_FORWARDED_FOR=f"1.2.3.{n}, 200.1.1.1")

            respuesta = self.entrar("clave-mala", HTTP_X_FORWARDED_FOR="9.9.9.9, 200.1.1.1")
            otra_persona = self.entrar(PASSWORD, HTTP_X_FORWARDED_FOR="200.2.2.2")

        self.assertEqual(respuesta.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(otra_persona.status_code, status.HTTP_200_OK)


@con_tasas(renovar_token="3/min")
class LimiteRenovacionTests(LimpiarConteo):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = crear_usuario()

    def test_pasado_el_limite_la_renovacion_da_429(self):
        for _ in range(3):
            self.client.post(URL_REFRESH, {"refresh": "token-invalido"}, format="json")

        respuesta = self.client.post(URL_REFRESH, {"refresh": str(RefreshToken.for_user(self.usuario))}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


@con_tasas(registro="2/hour")
class LimiteRegistroTests(LimpiarConteo):
    def datos(self, n):
        return {
            "tipo": "natural",
            "nombre": f"Cliente {n}",
            "identificacion": f"10000000{n}",
            "email": f"cliente{n}@correo.com",
            "ciudad": "CTG",
            "password": PASSWORD,
        }

    def test_pasado_el_limite_no_crea_mas_cuentas(self):
        for n in range(2):
            self.assertEqual(
                self.client.post(URL_REGISTRO, self.datos(n), format="json").status_code, status.HTTP_201_CREATED
            )

        respuesta = self.client.post(URL_REGISTRO, self.datos(2), format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertFalse(Cliente.objects.filter(nombre="Cliente 2").exists())


class TasasRealesTests(SimpleTestCase):
    def test_settings_no_sube_las_tasas_al_correr_las_pruebas(self):
        # La configuración no sabe nada de las pruebas: con el valor por defecto
        # de THROTTLE_LOGIN el login queda en 5 por minuto (revisión del 16/10, punto 11).
        if "THROTTLE_LOGIN" not in os.environ:
            self.assertEqual(settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["login"], "5/min")


@sin_limite_de_intentos
class DecoradorSinLimiteTests(APITestCase):
    def test_sube_solo_login_renovacion_y_registro(self):
        tasas = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]

        self.assertEqual(tasas["login"], "10000/min")
        self.assertEqual(tasas["registro"], "10000/min")
        self.assertEqual(tasas["recuperar_clave"], "5/hour")

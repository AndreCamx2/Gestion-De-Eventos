"""Configuración segura del correo y envío fuera de la petición (SGDE-96)."""
import os
import subprocess
import sys
import threading
from pathlib import Path
from unittest import mock

from django.core.mail import EmailMessage, get_connection
from django.test import SimpleTestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .checks import BACKEND_SIN_CONFIGURAR, revisar_correo
from .correos import en_segundo_plano
from .recuperacion import solicitar_recuperacion

BACKEND_DIR = Path(__file__).resolve().parents[2]


def ids(avisos):
    return [aviso.id for aviso in avisos]


class CorreoSinConfigurarTests(SimpleTestCase):
    def test_no_envia_y_deja_un_error_sin_el_contenido(self):
        conexion = get_connection(BACKEND_SIN_CONFIGURAR)
        mensaje = EmailMessage("Recupera tu contraseña", "enlace?uid=MQ&token=secreto-123", to=["ana@correo.com"])

        with self.assertLogs("apps.usuarios.correos", level="ERROR") as registro:
            enviados = conexion.send_messages([mensaje])

        self.assertEqual(enviados, 0)
        salida = "\n".join(registro.output)
        self.assertIn("Recupera tu contraseña", salida)
        self.assertNotIn("secreto-123", salida)
        self.assertNotIn("ana@correo.com", salida)


class ValorPorDefectoTests(SimpleTestCase):
    """El valor por defecto se calcula al importar settings.py: se revisa en otro proceso."""

    def backend_con(self, debug):
        entorno = {k: v for k, v in os.environ.items() if k != "EMAIL_BACKEND"}
        entorno.update(DEBUG=debug, SECRET_KEY="solo-para-la-prueba", DJANGO_SETTINGS_MODULE="config.settings")
        codigo = "import django; django.setup(); from django.conf import settings; print(settings.EMAIL_BACKEND)"
        salida = subprocess.run(
            [sys.executable, "-c", codigo], cwd=BACKEND_DIR, env=entorno, capture_output=True, text=True, check=True,
        )
        return salida.stdout.strip().splitlines()[-1]

    def test_en_produccion_sin_email_backend_no_usa_la_consola(self):
        self.assertEqual(self.backend_con("False"), BACKEND_SIN_CONFIGURAR)

    def test_en_local_sin_email_backend_usa_la_consola(self):
        self.assertEqual(self.backend_con("True"), "django.core.mail.backends.console.EmailBackend")


class ChequeosDeCorreoTests(SimpleTestCase):
    @override_settings(EMAIL_BACKEND=BACKEND_SIN_CONFIGURAR, FRONTEND_URL="https://sgde.vercel.app")
    def test_avisa_si_el_correo_no_esta_configurado(self):
        self.assertEqual(ids(revisar_correo(None)), ["sgde.W001"])

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend", FRONTEND_URL="")
    def test_avisa_si_falta_frontend_url(self):
        self.assertEqual(ids(revisar_correo(None)), ["sgde.W002"])

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend", FRONTEND_URL="https://sgde.vercel.app")
    def test_bien_configurado_no_avisa(self):
        self.assertEqual(revisar_correo(None), [])

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend", FRONTEND_URL="http://localhost:5173",
    )
    def test_los_valores_de_local_no_avisan(self):
        self.assertEqual(revisar_correo(None), [])


class EnSegundoPlanoTests(SimpleTestCase):
    @override_settings(CORREOS_EN_SEGUNDO_PLANO=True)
    def test_corre_en_otro_hilo_y_cierra_sus_conexiones(self):
        hilos = []
        listo = threading.Event()

        def tarea(valor):
            hilos.append((threading.current_thread(), valor))
            listo.set()

        with mock.patch("apps.usuarios.correos.connections") as conexiones:
            hilo = en_segundo_plano(tarea, "x")
            hilo.join(timeout=5)

        self.assertTrue(listo.is_set())
        self.assertIsNot(hilos[0][0], threading.current_thread())
        self.assertEqual(hilos[0][1], "x")
        conexiones.close_all.assert_called_once()

    @override_settings(CORREOS_EN_SEGUNDO_PLANO=True)
    def test_un_error_en_el_hilo_queda_en_el_log(self):
        def falla():
            raise RuntimeError("SMTP caído")

        with mock.patch("apps.usuarios.correos.connections"), \
                self.assertLogs("apps.usuarios.correos", level="ERROR"):
            en_segundo_plano(falla).join(timeout=5)

    @override_settings(CORREOS_EN_SEGUNDO_PLANO=False)
    def test_apagado_corre_en_linea(self):
        llamadas = []
        self.assertIsNone(en_segundo_plano(llamadas.append, 1))
        self.assertEqual(llamadas, [1])


class RecuperarSinEsperarElCorreoTests(APITestCase):
    def test_la_vista_responde_sin_buscar_ni_enviar_dentro_de_la_peticion(self):
        with mock.patch("apps.usuarios.views.en_segundo_plano") as segundo_plano:
            respuesta = self.client.post("/api/clave/recuperar/", {"email": "ana@correo.com"}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        segundo_plano.assert_called_once_with(solicitar_recuperacion, "ana@correo.com")

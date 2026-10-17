import re
from datetime import datetime, timedelta
from unittest import mock

from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.core.pruebas import correos_en_linea, sin_limite_de_intentos

from .models import Rol, Usuario

PASSWORD = "Clave-Segura-123"
NUEVA = "Otra-Clave-Larga-456"
URL_RECUPERAR = "/api/clave/recuperar/"
URL_RESTABLECER = "/api/clave/restablecer/"
URL_TOKEN = "/api/token/"
URL_REFRESH = "/api/token/refresh/"
URL_REGISTRO = "/api/registro/"
FRONTEND = "https://sgde.test"


def crear_usuario(email="ana@correo.com", activo=True):
    return Usuario.objects.create_user(
        username=email, email=email, password=PASSWORD, is_active=activo,
        rol=Rol.objects.get(codigo="cliente"),
    )


def datos_del_enlace(correo):
    enlace = re.search(r"https?://\S+", correo.body).group(0)
    uid = re.search(r"uid=([^&\s]+)", enlace).group(1)
    token = re.search(r"token=([^&\s]+)", enlace).group(1)
    return enlace, uid, token


@correos_en_linea
@sin_limite_de_intentos
@override_settings(FRONTEND_URL=FRONTEND)
class SolicitarRecuperacionTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_correo_registrado_recibe_el_enlace(self):
        usuario = crear_usuario()

        respuesta = self.client.post(URL_RECUPERAR, {"email": usuario.email}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [usuario.email])
        enlace, _, _ = datos_del_enlace(mail.outbox[0])
        self.assertTrue(enlace.startswith(f"{FRONTEND}/restablecer-clave?"))

    def test_no_importan_mayusculas_en_el_correo(self):
        crear_usuario()

        self.client.post(URL_RECUPERAR, {"email": "ANA@Correo.com"}, format="json")

        self.assertEqual(len(mail.outbox), 1)

    def test_correo_no_registrado_responde_igual_y_no_envia_nada(self):
        usuario = crear_usuario()
        registrado = self.client.post(URL_RECUPERAR, {"email": usuario.email}, format="json")
        mail.outbox.clear()

        desconocido = self.client.post(URL_RECUPERAR, {"email": "nadie@correo.com"}, format="json")

        self.assertEqual(desconocido.status_code, status.HTTP_200_OK)
        self.assertEqual(desconocido.data, registrado.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_usuario_inactivo_no_recibe_enlace(self):
        usuario = crear_usuario(activo=False)

        respuesta = self.client.post(URL_RECUPERAR, {"email": usuario.email}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_correo_mal_escrito_da_400(self):
        respuesta = self.client.post(URL_RECUPERAR, {"email": "no-es-un-correo"}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", respuesta.data)

    def test_si_el_correo_falla_la_respuesta_no_cambia(self):
        usuario = crear_usuario()

        with mock.patch("apps.usuarios.correos.send_mail", side_effect=OSError("sin servidor")), \
                self.assertLogs("apps.usuarios.correos", level="ERROR"):
            respuesta = self.client.post(URL_RECUPERAR, {"email": usuario.email}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)

    def test_limita_las_solicitudes_seguidas(self):
        for _ in range(5):
            self.client.post(URL_RECUPERAR, {"email": "nadie@correo.com"}, format="json")

        respuesta = self.client.post(URL_RECUPERAR, {"email": "nadie@correo.com"}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_un_token_vencido_en_la_cabecera_no_estorba(self):
        usuario = crear_usuario()
        self.client.credentials(HTTP_AUTHORIZATION="Bearer token-viejo")

        respuesta = self.client.post(URL_RECUPERAR, {"email": usuario.email}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)


@correos_en_linea
@sin_limite_de_intentos
@override_settings(FRONTEND_URL=FRONTEND)
class RestablecerClaveTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.usuario = crear_usuario()
        self.client.post(URL_RECUPERAR, {"email": self.usuario.email}, format="json")
        _, self.uid, self.token = datos_del_enlace(mail.outbox[0])

    def restablecer(self, password=NUEVA, uid=None, token=None):
        return self.client.post(
            URL_RESTABLECER,
            {"uid": uid or self.uid, "token": token or self.token, "password": password},
            format="json",
        )

    def entrar(self, password):
        return self.client.post(URL_TOKEN, {"username": self.usuario.username, "password": password}, format="json")

    def test_con_el_enlace_cambia_la_clave(self):
        respuesta = self.restablecer()

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(self.entrar(NUEVA).status_code, status.HTTP_200_OK)
        self.assertEqual(self.entrar(PASSWORD).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_el_enlace_sirve_una_sola_vez(self):
        self.restablecer()

        respuesta = self.restablecer(password="Tercera-Clave-789")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("enlace", respuesta.data["detail"])

    def test_token_falso_da_400(self):
        respuesta = self.restablecer(token="token-inventado")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.entrar(PASSWORD).status_code, status.HTTP_200_OK)

    def test_uid_falso_da_400(self):
        respuesta = self.restablecer(uid="basura")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(PASSWORD_RESET_TIMEOUT=3600)
    def test_enlace_vencido_da_400(self):
        dentro_de_dos_horas = datetime.now() + timedelta(hours=2)

        with mock.patch.object(default_token_generator, "_now", return_value=dentro_de_dos_horas):
            respuesta = self.restablecer()

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_clave_debil_da_400_y_no_cambia_nada(self):
        respuesta = self.restablecer(password="12345678")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", respuesta.data)
        self.assertEqual(self.entrar(PASSWORD).status_code, status.HTTP_200_OK)

    def test_cierra_las_sesiones_abiertas(self):
        refresh = self.entrar(PASSWORD).data["refresh"]

        self.restablecer()

        respuesta = self.client.post(URL_REFRESH, {"refresh": refresh}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)


@correos_en_linea
@sin_limite_de_intentos
@override_settings(FRONTEND_URL=FRONTEND)
class BienvenidaTests(APITestCase):
    datos = {
        "tipo": "natural",
        "nombre": "María Bustamante",
        "identificacion": "1234567890",
        "telefono": "3000000000",
        "email": "maria@correo.com",
        "ciudad": "CTG",
        "password": PASSWORD,
    }

    def registrar(self):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(URL_REGISTRO, self.datos, format="json")

    def test_el_cliente_nuevo_recibe_la_bienvenida(self):
        respuesta = self.registrar()

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        correo = mail.outbox[0]
        self.assertEqual(correo.to, ["maria@correo.com"])
        self.assertIn("María Bustamante", correo.body)
        self.assertIn(f"{FRONTEND}/login", correo.body)
        self.assertNotIn(PASSWORD, correo.body)

    def test_si_el_correo_falla_la_cuenta_queda_creada(self):
        with mock.patch("apps.usuarios.correos.send_mail", side_effect=OSError("sin servidor")), \
                self.assertLogs("apps.usuarios.correos", level="ERROR"):
            respuesta = self.registrar()

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Cliente.objects.filter(usuario__email="maria@correo.com").exists())

    def test_un_registro_rechazado_no_envia_correo(self):
        crear_usuario(email="maria@correo.com")

        respuesta = self.registrar()

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(mail.outbox), 0)

    def test_los_usuarios_que_crea_el_administrador_no_reciben_bienvenida(self):
        admin = Usuario.objects.create_user(
            username="admin@correo.com", password=PASSWORD, rol=Rol.objects.get(codigo="administrador"),
        )
        self.client.force_authenticate(admin)

        with self.captureOnCommitCallbacks(execute=True):
            respuesta = self.client.post(
                "/api/usuarios/",
                {"username": "asesor", "email": "asesor@correo.com", "password": PASSWORD,
                 "rol": Rol.objects.exclude(codigo__in=["cliente", "administrador"]).first().pk},
                format="json",
            )

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 0)

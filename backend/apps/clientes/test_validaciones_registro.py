from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.pruebas import sin_limite_de_intentos
from apps.usuarios.models import Usuario

from .models import Cliente, Empresa
from .test_registro_publico import URL_REGISTRO, datos_juridico, datos_natural
from .validadores import (
    MSG_CEDULA, MSG_NIT, MSG_NIT_DIGITO, MSG_NOMBRE, MSG_RAZON_SOCIAL, MSG_TELEFONO, digito_verificacion_nit,
)


@sin_limite_de_intentos
class FormatoRegistroTests(APITestCase):
    def registrar(self, datos):
        return self.client.post(URL_REGISTRO, datos, format="json")

    def assertRechazado(self, respuesta, campo, mensaje, email):
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.data[campo], [mensaje])
        self.assertFalse(Usuario.objects.filter(username=email).exists())

    def test_cedula_con_letras(self):
        self.assertRechazado(
            self.registrar(datos_natural(identificacion="abc12345")), "identificacion", MSG_CEDULA, "maria@correo.com"
        )

    def test_cedula_muy_corta(self):
        self.assertRechazado(
            self.registrar(datos_natural(identificacion="12345")), "identificacion", MSG_CEDULA, "maria@correo.com"
        )

    def test_cedula_con_puntos_se_guarda_limpia(self):
        respuesta = self.registrar(datos_natural(identificacion="1.045.678"))

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Cliente.objects.filter(identificacion="1045678").exists())

    def test_nombre_con_numeros(self):
        self.assertRechazado(
            self.registrar(datos_natural(nombre="Juan123")), "nombre", MSG_NOMBRE, "maria@correo.com"
        )

    def test_nombre_con_espacios_de_mas_se_guarda_limpio(self):
        respuesta = self.registrar(datos_natural(nombre="  María   Bustamante "))

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Cliente.objects.filter(nombre="María Bustamante").exists())

    def test_telefono_invalido(self):
        self.assertRechazado(
            self.registrar(datos_natural(telefono="12345")), "telefono", MSG_TELEFONO, "maria@correo.com"
        )

    def test_telefono_con_indicativo_se_guarda_en_diez_digitos(self):
        respuesta = self.registrar(datos_natural(telefono="+57 300 123 4567"))

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Cliente.objects.get(identificacion="1234567890").telefono, "3001234567")

    def test_nit_con_letras(self):
        self.assertRechazado(
            self.registrar(datos_juridico(identificacion="NIT90012")), "identificacion", MSG_NIT, "contacto@caribe.com"
        )

    def test_nit_con_digito_de_verificacion_incorrecto(self):
        self.assertRechazado(
            self.registrar(datos_juridico(identificacion="900123456-7")),
            "identificacion",
            MSG_NIT_DIGITO,
            "contacto@caribe.com",
        )

    def test_nit_sin_digito_de_verificacion(self):
        respuesta = self.registrar(datos_juridico(identificacion="900123456"))

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Empresa.objects.filter(identificacion="900123456").exists())

    def test_razon_social_con_simbolos(self):
        self.assertRechazado(
            self.registrar(datos_juridico(razon_social="Eventos <script>")),
            "razon_social",
            MSG_RAZON_SOCIAL,
            "contacto@caribe.com",
        )


class DigitoVerificacionNitTests(APITestCase):
    def test_nits_conocidos(self):
        self.assertEqual(digito_verificacion_nit("900123456"), 8)
        self.assertEqual(digito_verificacion_nit("890480184"), 4)
        self.assertEqual(digito_verificacion_nit("800197268"), 4)

"""SGDE-115: el registro público responde 400 en el campo correcto, nunca 500 ni el error genérico."""
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.pruebas import sin_limite_de_intentos
from apps.sitios.models import Ciudad
from apps.usuarios.models import Usuario

from .models import Cliente, Empresa
from .serializers import MSG_IDENTIFICACION_REPETIDA, MSG_NIT_REPETIDO

URL_REGISTRO = "/api/registro/"
PASSWORD = "Clave-Segura-123"


def datos_natural(**cambios):
    return {
        "tipo": "natural",
        "nombre": "María Bustamante",
        "identificacion": "1234567890",
        "telefono": "3000000000",
        "email": "maria@correo.com",
        "ciudad": "CTG",
        "password": PASSWORD,
        **cambios,
    }


def datos_juridico(**cambios):
    return {
        "tipo": "juridica",
        "nombre": "Carlos Pérez",
        "razon_social": "Eventos del Caribe S.A.S.",
        "identificacion": "900123456-7",
        "telefono": "3000000001",
        "email": "contacto@caribe.com",
        "ciudad": "CTG",
        "password": PASSWORD,
        **cambios,
    }


@sin_limite_de_intentos
class CiudadDelRegistroTests(APITestCase):
    def test_ciudad_inexistente_da_400_en_ciudad(self):
        respuesta = self.client.post(URL_REGISTRO, datos_natural(ciudad="XXX"), format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ciudad", respuesta.data)
        self.assertFalse(Usuario.objects.filter(username="maria@correo.com").exists())

    def test_ciudad_valida_queda_en_la_empresa_del_juridico(self):
        respuesta = self.client.post(URL_REGISTRO, datos_juridico(), format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        empresa = Empresa.objects.get(identificacion="900123456-7")
        self.assertEqual(empresa.ciudad, Ciudad.objects.get(codigo="CTG"))


@sin_limite_de_intentos
class IdentificacionRepetidaTests(APITestCase):
    def test_natural_con_identificacion_existente_da_400_en_identificacion(self):
        Cliente.objects.create(tipo=Cliente.NATURAL, nombre="Otra persona", identificacion="1234567890")

        respuesta = self.client.post(URL_REGISTRO, datos_natural(), format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.data["identificacion"], [MSG_IDENTIFICACION_REPETIDA])
        self.assertFalse(Usuario.objects.filter(username="maria@correo.com").exists())

    def test_juridico_con_nit_existente_da_400_en_identificacion(self):
        Empresa.objects.create(razon_social="Empresa previa", identificacion="900123456-7")

        respuesta = self.client.post(URL_REGISTRO, datos_juridico(), format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.data["identificacion"], [MSG_NIT_REPETIDO])
        self.assertFalse(Usuario.objects.filter(username="contacto@caribe.com").exists())

    def test_varios_errores_salen_juntos(self):
        Cliente.objects.create(tipo=Cliente.NATURAL, nombre="Otra persona", identificacion="1234567890")
        self.client.post(URL_REGISTRO, datos_natural(identificacion="555"), format="json")

        respuesta = self.client.post(URL_REGISTRO, datos_natural(), format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", respuesta.data)
        self.assertIn("identificacion", respuesta.data)

    def test_identificacion_nueva_registra_normal(self):
        respuesta = self.client.post(URL_REGISTRO, datos_natural(), format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Cliente.objects.filter(identificacion="1234567890", usuario__email="maria@correo.com").exists())

from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.pruebas import sin_limite_de_intentos
from apps.usuarios.models import Rol, Usuario

from .models import Cliente, Empresa
from .serializers import MSG_NIT_REPETIDO
from .test_registro_publico import URL_REGISTRO, datos_natural
from .validadores import MSG_CEDULA, MSG_NIT, MSG_NIT_DIGITO, MSG_NOMBRE, MSG_RAZON_SOCIAL, MSG_TELEFONO

PASSWORD = "Clave-Segura-123"


class ClienteDesdeAdministracionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_user(
            "admin@test.com", password=PASSWORD, rol=Rol.objects.get(codigo="administrador")
        )

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def crear(self, **datos):
        return self.client.post("/api/clientes/", {"tipo": "natural", "nombre": "Ana Pérez", **datos}, format="json")

    def test_el_nombre_no_admite_numeros_ni_simbolos(self):
        for nombre in ("Ana123", "!!!", "Ana -- Pérez", "-Ana", "Ana'"):
            with self.subTest(nombre=nombre):
                respuesta = self.crear(nombre=nombre)
                self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(respuesta.data["nombre"], [MSG_NOMBRE])

    def test_acepta_nombres_compuestos_reales(self):
        for nombre in ("María-José O'Neill", "Ñengo Ibáñez", "José Pérez"):
            with self.subTest(nombre=nombre):
                self.assertEqual(self.crear(nombre=nombre).status_code, status.HTTP_201_CREATED)

    def test_la_tilde_escrita_aparte_se_guarda_igual_que_la_normal(self):
        respuesta = self.crear(nombre="José Pérez")

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Cliente.objects.get(pk=respuesta.data["id"]).nombre, "José Pérez")

    def test_la_cedula_solo_admite_digitos_latinos(self):
        for cedula in ("abc", "١٠٤٧٠٠٠١١١", "0047000111", "12345", "12345678901"):
            with self.subTest(cedula=cedula):
                respuesta = self.crear(identificacion=cedula)
                self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(respuesta.data["identificacion"], [MSG_CEDULA])

    def test_la_cedula_con_puntos_choca_con_la_misma_sin_puntos(self):
        self.assertEqual(self.crear(identificacion="1047000111").status_code, status.HTTP_201_CREATED)

        respuesta = self.crear(nombre="Otra Persona", identificacion="1.047.000.111")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Ya existe", str(respuesta.data["identificacion"]))

    def test_telefono_invalido_da_400(self):
        respuesta = self.crear(telefono="xyz")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.data["telefono"], [MSG_TELEFONO])

    def test_el_correo_se_guarda_en_minuscula(self):
        respuesta = self.crear(correo="Ana.Perez@Correo.COM")

        self.assertEqual(respuesta.data["correo"], "ana.perez@correo.com")

    def test_observaciones_de_mas_de_2000_caracteres_dan_400(self):
        respuesta = self.crear(observaciones_internas="a" * 2001)

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("observaciones_internas", respuesta.data)


class EmpresaTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_user(
            "admin@test.com", password=PASSWORD, rol=Rol.objects.get(codigo="administrador")
        )

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def crear(self, **datos):
        return self.client.post(
            "/api/empresas/", {"razon_social": "Eventos del Caribe S.A.S.", "identificacion": "900123456-8", **datos},
            format="json",
        )

    def test_crea_una_empresa_con_nit_valido(self):
        self.assertEqual(self.crear().status_code, status.HTTP_201_CREATED)

    def test_razon_social_sin_letras_ni_numeros_da_400(self):
        respuesta = self.crear(razon_social="!!!")

        self.assertEqual(respuesta.data["razon_social"], [MSG_RAZON_SOCIAL])

    def test_nit_con_letras_da_400(self):
        self.assertEqual(self.crear(identificacion="abc").data["identificacion"], [MSG_NIT])

    def test_nit_con_digito_de_verificacion_equivocado_da_400(self):
        self.assertEqual(self.crear(identificacion="900123456-0").data["identificacion"], [MSG_NIT_DIGITO])

    def test_el_mismo_nit_con_o_sin_digito_es_la_misma_empresa(self):
        Empresa.objects.create(razon_social="Ya registrada", identificacion="900123456")

        for nit in ("900123456-8", "900.123.456"):
            with self.subTest(nit=nit):
                self.assertEqual(self.crear(identificacion=nit).data["identificacion"], [MSG_NIT_REPETIDO])


@sin_limite_de_intentos
class RegistroPublicoExtremoTests(APITestCase):
    def registrar(self, **cambios):
        return self.client.post(URL_REGISTRO, datos_natural(**cambios), format="json")

    def test_el_correo_se_guarda_en_minuscula_y_no_se_repite_con_otras_mayusculas(self):
        self.assertEqual(self.registrar(email="Maria@Correo.com").status_code, status.HTTP_201_CREATED)
        self.assertTrue(Usuario.objects.filter(username="maria@correo.com").exists())

        respuesta = self.registrar(email="MARIA@CORREO.COM", identificacion="1047000222")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", respuesta.data)

    def test_entra_con_el_correo_escrito_con_otras_mayusculas(self):
        self.registrar(email="maria@correo.com")

        respuesta = self.client.post("/api/token/", {"username": "Maria@Correo.com", "password": PASSWORD}, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)

    def test_un_correo_de_mas_de_150_caracteres_da_400_y_no_500(self):
        respuesta = self.registrar(email=f"{'a' * 150}@correo.com")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", respuesta.data)

    def test_una_contrasena_de_mas_de_128_caracteres_da_400(self):
        respuesta = self.registrar(password="Clave-Segura-" + "x" * 200)

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", respuesta.data)

    def test_cedula_de_ceros_o_con_digitos_arabes_da_400(self):
        for cedula in ("0000000", "١٠٤٧٠٠٠٩٩٦"):
            with self.subTest(cedula=cedula):
                self.assertEqual(self.registrar(identificacion=cedula).data["identificacion"], [MSG_CEDULA])

    def test_nombre_hecho_de_signos_da_400(self):
        self.assertEqual(self.registrar(nombre="-' -' Ab").data["nombre"], [MSG_NOMBRE])

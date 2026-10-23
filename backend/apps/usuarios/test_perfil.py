from django.core import mail
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.clientes.models import Cliente, Empresa
from apps.core.pruebas import correos_en_linea, sin_limite_de_intentos
from apps.proveedores.models import Proveedor

from .models import Rol, Usuario
from .perfil import MSG_CORREO_IGUAL, MSG_CORREO_REGISTRADO, MSG_NO_EDITABLE, MSG_PASSWORD_IGUAL, MSG_PASSWORD_INCORRECTA
from .test_limites import con_tasas

PASSWORD = "Clave-Segura-123"
URL_PERFIL = "/api/mi-perfil/"
URL_CORREO = "/api/mi-perfil/correo/"
URL_CONTRASENA = "/api/mi-perfil/contrasena/"
URL_TOKEN = "/api/token/"
URL_REFRESH = "/api/token/refresh/"
URL_RECUPERAR = "/api/clave/recuperar/"


def crear_usuario(username, rol, email=""):
    return Usuario.objects.create_user(
        username=username, email=email, password=PASSWORD, rol=Rol.objects.get(codigo=rol),
    )


class PerfilBase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.u_cliente = crear_usuario("ana@correo.com", "cliente", email="ana@correo.com")
        cls.cliente = Cliente.objects.create(
            usuario=cls.u_cliente, tipo="natural", nombre="Ana Pérez", identificacion="1047000111",
            telefono="3001234567", observaciones_internas="Paga tarde",
        )
        cls.u_juridico = crear_usuario("compras@caribe.com", "cliente", email="compras@caribe.com")
        empresa = Empresa.objects.create(razon_social="Eventos Caribe S.A.S.", identificacion="900123456-7")
        Cliente.objects.create(usuario=cls.u_juridico, tipo="juridica", nombre="Luis Gómez", empresa=empresa)
        cls.u_proveedor = crear_usuario("sonido", "proveedor", email="sonido@caribe.com")
        cls.proveedor = Proveedor.objects.create(
            nombre="Sonido Caribe", identificacion="800555", contacto="Carlos 3005550000", usuario=cls.u_proveedor,
        )
        cls.u_sin_vincular = crear_usuario("luces", "proveedor", email="luces@caribe.com")
        cls.u_cliente_sin_ficha = crear_usuario("suelto", "cliente", email="suelto@correo.com")
        cls.admin = crear_usuario("admin", "administrador", email="admin@sgde.com")

    def setUp(self):
        cache.clear()

    def como(self, usuario):
        self.client.force_authenticate(user=usuario)


class VerPerfilTests(PerfilBase):
    def test_el_cliente_ve_solo_sus_datos(self):
        self.como(self.u_cliente)
        r = self.client.get(URL_PERFIL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data, {
            "rol": "cliente", "nombre": "Ana Pérez", "tipo": "natural", "identificacion": "1047000111",
            "empresa": "", "telefono": "3001234567", "usuario": "ana@correo.com", "correo": "ana@correo.com",
            "inicia_con_correo": True,
        })

    def test_el_cliente_juridico_ve_el_nit_y_la_razon_social(self):
        self.como(self.u_juridico)
        r = self.client.get(URL_PERFIL)
        self.assertEqual((r.data["identificacion"], r.data["empresa"]), ("900123456-7", "Eventos Caribe S.A.S."))

    def test_el_proveedor_ve_sus_datos(self):
        self.como(self.u_proveedor)
        r = self.client.get(URL_PERFIL)
        self.assertEqual(r.data, {
            "rol": "proveedor", "nombre": "Sonido Caribe", "identificacion": "800555",
            "contacto": "Carlos 3005550000", "usuario": "sonido", "correo": "sonido@caribe.com",
            "inicia_con_correo": False,
        })

    def test_el_administrador_recibe_403(self):
        self.como(self.admin)
        for metodo, url in (("get", URL_PERFIL), ("post", URL_CORREO), ("post", URL_CONTRASENA)):
            with self.subTest(url=url):
                r = getattr(self.client, metodo)(url, {}, format="json")
                self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(r.data["codigo"], "sin_perfil")

    def test_proveedor_o_cliente_sin_vincular_reciben_403_con_su_codigo(self):
        for usuario, codigo in ((self.u_sin_vincular, "proveedor_sin_vincular"), (self.u_cliente_sin_ficha, "cliente_sin_vincular")):
            with self.subTest(codigo=codigo):
                self.como(usuario)
                r = self.client.get(URL_PERFIL)
                self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(r.data["codigo"], codigo)

    def test_sin_sesion_401(self):
        self.assertEqual(self.client.get(URL_PERFIL).status_code, status.HTTP_401_UNAUTHORIZED)


class EditarPerfilTests(PerfilBase):
    def test_el_cliente_cambia_su_telefono_o_lo_deja_vacio(self):
        self.como(self.u_cliente)
        r = self.client.patch(URL_PERFIL, {"telefono": "6056601234"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["telefono"], "6056601234")
        self.assertEqual(self.client.patch(URL_PERFIL, {"telefono": ""}, format="json").data["telefono"], "")

    def test_telefono_invalido_da_400(self):
        self.como(self.u_cliente)
        for telefono in ("12345", "2001234567", "30012345ab"):
            with self.subTest(telefono=telefono):
                r = self.client.patch(URL_PERFIL, {"telefono": telefono}, format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("telefono", r.data)
        self.cliente.refresh_from_db()
        self.assertEqual(self.cliente.telefono, "3001234567")

    def test_un_campo_no_editable_da_400_en_ese_campo(self):
        self.como(self.u_cliente)
        r = self.client.patch(URL_PERFIL, {"nombre": "Otra", "telefono": "3009998877"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data, {"nombre": [MSG_NO_EDITABLE]})
        self.cliente.refresh_from_db()
        self.assertEqual((self.cliente.nombre, self.cliente.telefono), ("Ana Pérez", "3001234567"))

    def test_el_proveedor_cambia_su_contacto_sin_espacios_en_los_extremos(self):
        self.como(self.u_proveedor)
        r = self.client.patch(URL_PERFIL, {"contacto": "  Marta 3014445555  "}, format="json")
        self.assertEqual(r.data["contacto"], "Marta 3014445555")
        r = self.client.patch(URL_PERFIL, {"contacto": "x" * 121}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("contacto", r.data)
        r = self.client.patch(URL_PERFIL, {"telefono": "3001234567"}, format="json")
        self.assertEqual(r.data, {"telefono": [MSG_NO_EDITABLE]})


@correos_en_linea
@sin_limite_de_intentos
class CambiarCorreoTests(PerfilBase):
    def test_contrasena_actual_incorrecta_da_400(self):
        self.como(self.u_cliente)
        r = self.client.post(URL_CORREO, {"password_actual": "mala", "correo_nuevo": "nueva@correo.com"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["password_actual"], [MSG_PASSWORD_INCORRECTA])

    def test_correo_de_otro_igual_al_actual_o_invalido_da_400(self):
        self.como(self.u_cliente)
        casos = (("SONIDO@caribe.com", MSG_CORREO_REGISTRADO), ("Compras@Caribe.com", MSG_CORREO_REGISTRADO), ("ANA@correo.com", MSG_CORREO_IGUAL))
        for correo, mensaje in casos:
            with self.subTest(correo=correo):
                r = self.client.post(URL_CORREO, {"password_actual": PASSWORD, "correo_nuevo": correo}, format="json")
                self.assertEqual(r.data["correo_nuevo"], [mensaje])
        r = self.client.post(URL_CORREO, {"password_actual": PASSWORD, "correo_nuevo": "ana correo.com"}, format="json")
        self.assertIn("correo_nuevo", r.data)

    def test_cambia_correo_usuario_y_ficha_y_luego_entra_y_recupera_con_el_nuevo(self):
        self.como(self.u_cliente)
        r = self.client.post(URL_CORREO, {"password_actual": PASSWORD, "correo_nuevo": "Ana.Nueva@Correo.com"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual((r.data["correo"], r.data["usuario"], r.data["inicia_con_correo"]), ("ana.nueva@correo.com",) * 2 + (True,))
        self.u_cliente.refresh_from_db()
        self.cliente.refresh_from_db()
        self.assertEqual((self.u_cliente.email, self.u_cliente.username, self.cliente.correo), ("ana.nueva@correo.com",) * 3)

        self.client.force_authenticate(user=None)
        r = self.client.post(URL_TOKEN, {"username": "ana.nueva@correo.com", "password": PASSWORD}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post(URL_TOKEN, {"username": "ana@correo.com", "password": PASSWORD}, format="json").status_code, 401)

        self.client.post(URL_RECUPERAR, {"email": "ana.nueva@correo.com"}, format="json")
        self.assertEqual([m.to for m in mail.outbox], [["ana.nueva@correo.com"]])

    def test_si_el_usuario_no_es_el_correo_solo_cambia_el_correo(self):
        self.como(self.u_proveedor)
        r = self.client.post(URL_CORREO, {"password_actual": PASSWORD, "correo_nuevo": "ventas@sonido.com"}, format="json")
        self.assertEqual((r.data["usuario"], r.data["inicia_con_correo"]), ("sonido", False))
        self.u_proveedor.refresh_from_db()
        self.assertEqual((self.u_proveedor.username, self.u_proveedor.email), ("sonido", "ventas@sonido.com"))

    def test_el_proveedor_sin_vincular_tambien_puede_cambiarlo(self):
        self.como(self.u_sin_vincular)
        r = self.client.post(URL_CORREO, {"password_actual": PASSWORD, "correo_nuevo": "luces2@caribe.com"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)


@sin_limite_de_intentos
class CambiarContrasenaTests(PerfilBase):
    def test_contrasena_actual_incorrecta_o_nueva_igual_dan_400(self):
        self.como(self.u_cliente)
        r = self.client.post(URL_CONTRASENA, {"password_actual": "mala", "password_nueva": "Otra-Clave-456"}, format="json")
        self.assertEqual(r.data["password_actual"], [MSG_PASSWORD_INCORRECTA])
        r = self.client.post(URL_CONTRASENA, {"password_actual": PASSWORD, "password_nueva": PASSWORD}, format="json")
        self.assertEqual(r.data["password_nueva"], [MSG_PASSWORD_IGUAL])

    def test_contrasena_debil_da_400_en_password_nueva(self):
        self.como(self.u_cliente)
        for debil in ("12345678", "corta1", "password1"):
            with self.subTest(debil=debil):
                r = self.client.post(URL_CONTRASENA, {"password_actual": PASSWORD, "password_nueva": debil}, format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("password_nueva", r.data)
        self.u_cliente.refresh_from_db()
        self.assertTrue(self.u_cliente.check_password(PASSWORD))

    def test_cambia_la_contrasena_cierra_las_otras_sesiones_y_entrega_tokens_nuevos(self):
        viejo = str(RefreshToken.for_user(self.u_cliente))
        self.como(self.u_cliente)
        r = self.client.post(URL_CONTRASENA, {"password_actual": PASSWORD, "password_nueva": "Nueva-Clave-789"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(set(r.data), {"detail", "access", "refresh"})

        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(URL_REFRESH, {"refresh": viejo}, format="json").status_code, 401)
        self.assertEqual(self.client.post(URL_REFRESH, {"refresh": r.data["refresh"]}, format="json").status_code, 200)
        r = self.client.post(URL_TOKEN, {"username": "ana@correo.com", "password": "Nueva-Clave-789"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)


class LimiteDeIntentosPerfilTests(PerfilBase):
    @con_tasas(cambiar_credenciales="2/min")
    def test_pasado_el_limite_responde_429(self):
        self.como(self.u_cliente)
        datos = {"password_actual": "mala", "password_nueva": "Otra-Clave-456"}
        codigos = [self.client.post(URL_CONTRASENA, datos, format="json").status_code for _ in range(3)]
        self.assertEqual(codigos, [400, 400, 429])
        r = self.client.post(URL_CORREO, {"password_actual": "mala", "correo_nuevo": "x@correo.com"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

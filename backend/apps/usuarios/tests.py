from rest_framework import status
from rest_framework.test import APITestCase

from rest_framework.exceptions import ValidationError

from apps.clientes.models import Cliente

from .models import Rol, Usuario
from .services import MSG_ROL_CLIENTE, MSG_ROL_CON_CLIENTE, validar_cambio_usuario

PASSWORD = "Clave-Segura-123"

# Endpoints de administración: solo el rol "administrador" puede usarlos.
ENDPOINTS_ADMIN = [
    "/api/clientes/",
    "/api/empresas/",
    "/api/sitios/",
    "/api/salones/",
    "/api/montajes/",
    "/api/salon-montajes/",
    "/api/conceptos/",
    "/api/proveedores/",
    "/api/stock/",
    "/api/usuarios/",
]


def crear_usuario(username, codigo_rol):
    rol = Rol.objects.get(codigo=codigo_rol)
    return Usuario.objects.create_user(username=username, password=PASSWORD, rol=rol)


class MatrizAccesoPorRolTests(APITestCase):
    """SEG-001: cliente y proveedor no pueden usar los endpoints de administración."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.cliente = crear_usuario("cliente@test.com", "cliente")
        cls.proveedor = crear_usuario("proveedor@test.com", "proveedor")

    def test_sin_token_recibe_401(self):
        for url in ENDPOINTS_ADMIN + ["/api/usuarios/registro/"]:
            with self.subTest(url=url, metodo="GET"):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)
            with self.subTest(url=url, metodo="POST"):
                self.assertEqual(self.client.post(url, {}, format="json").status_code,
                                 status.HTTP_401_UNAUTHORIZED)

    def test_cliente_y_proveedor_reciben_403(self):
        for usuario in (self.cliente, self.proveedor):
            self.client.force_authenticate(user=usuario)
            for url in ENDPOINTS_ADMIN:
                with self.subTest(rol=usuario.rol.codigo, url=url, metodo="GET"):
                    self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)
                with self.subTest(rol=usuario.rol.codigo, url=url, metodo="POST"):
                    self.assertEqual(self.client.post(url, {}, format="json").status_code,
                                     status.HTTP_403_FORBIDDEN)

    def test_administrador_pasa_el_permiso(self):
        """GET responde 200; POST vacío llega a la validación (400), no es rechazado (403)."""
        self.client.force_authenticate(user=self.admin)
        for url in ENDPOINTS_ADMIN:
            with self.subTest(url=url, metodo="GET"):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
            with self.subTest(url=url, metodo="POST"):
                self.assertEqual(self.client.post(url, {}, format="json").status_code,
                                 status.HTTP_400_BAD_REQUEST)

    def test_usuarios_me_sigue_abierto_a_cualquier_autenticado(self):
        for usuario in (self.admin, self.cliente, self.proveedor):
            self.client.force_authenticate(user=usuario)
            with self.subTest(rol=usuario.rol.codigo):
                self.assertEqual(self.client.get("/api/usuarios/me/").status_code, status.HTTP_200_OK)


class RegistroUsuariosInternosTests(APITestCase):
    """SEG-004: solo un administrador puede crear usuarios internos y fijar su rol."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.cliente = crear_usuario("cliente@test.com", "cliente")
        cls.rol_admin = Rol.objects.get(codigo="administrador")
        cls.rol_proveedor = Rol.objects.get(codigo="proveedor")

    def payload(self, rol):
        return {"username": "nuevo@test.com", "email": "nuevo@test.com",
                "password": PASSWORD, "rol": rol.id, "sitios": []}

    def test_cliente_no_puede_crear_usuarios_ni_fijar_rol(self):
        self.client.force_authenticate(user=self.cliente)
        antes = Usuario.objects.count()
        respuesta = self.client.post("/api/usuarios/registro/", self.payload(self.rol_admin), format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Usuario.objects.count(), antes)

    def test_administrador_puede_crear_usuario_con_rol(self):
        self.client.force_authenticate(user=self.admin)
        respuesta = self.client.post("/api/usuarios/registro/", self.payload(self.rol_proveedor), format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Usuario.objects.get(username="nuevo@test.com").rol, self.rol_proveedor)

    def test_no_se_puede_crear_usuario_interno_con_rol_cliente(self):
        """Hallazgo: el POST aceptaba rol=cliente y dejaba un usuario sin Cliente."""
        self.client.force_authenticate(user=self.admin)
        rol_cliente = Rol.objects.get(codigo="cliente")
        for url in ("/api/usuarios/", "/api/usuarios/registro/"):
            with self.subTest(url=url):
                antes = Usuario.objects.count()
                r = self.client.post(url, self.payload(rol_cliente), format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.json()["rol"], ["Los clientes se crean desde la pantalla de Clientes."])
                self.assertEqual(Usuario.objects.count(), antes)

    def test_contrasena_debil_es_rechazada(self):
        self.client.force_authenticate(user=self.admin)
        for url in ("/api/usuarios/", "/api/usuarios/registro/"):
            for debil in ("12345678", "password", "nuevo@test.com"):
                with self.subTest(url=url, password=debil):
                    datos = dict(self.payload(self.rol_proveedor), password=debil)
                    r = self.client.post(url, datos, format="json")
                    self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                    self.assertIn("password", r.json())
                    self.assertFalse(Usuario.objects.filter(username="nuevo@test.com").exists())

    def test_registro_publico_sigue_creando_usuarios_con_rol_cliente(self):
        r = self.client.post("/api/registro/", CadenaEscaladaSEG004Tests.REGISTRO, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Usuario.objects.get(username="atacante@test.com").rol.codigo, "cliente")


class CadenaEscaladaSEG004Tests(APITestCase):
    """SEG-004 de punta a punta, sin credenciales previas ni force_authenticate."""

    REGISTRO = {"tipo": "natural", "nombre": "Atacante", "identificacion": "999",
                "email": "atacante@test.com", "ciudad": "CTG", "password": PASSWORD}

    def test_la_cadena_completa_ya_no_produce_un_administrador(self):
        rol_admin = Rol.objects.get(codigo="administrador")
        self.assertFalse(Usuario.objects.filter(rol=rol_admin).exists())

        # (a) registro público: cualquiera crea una cuenta
        r = self.client.post("/api/registro/", self.REGISTRO, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

        # (b) login real con esa cuenta
        r = self.client.post("/api/token/", {"username": "atacante@test.com", "password": PASSWORD},
                             format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

        # (c) intento de crear un administrador con ese token
        r = self.client.post("/api/usuarios/registro/",
                             {"username": "root@test.com", "email": "root@test.com",
                              "password": PASSWORD, "rol": rol_admin.id, "sitios": []},
                             format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Usuario.objects.filter(rol=rol_admin).exists())

    def test_registro_publico_ignora_un_rol_enviado_en_el_payload(self):
        """Variante en un solo paso y sin token: el rol del payload no debe tener efecto."""
        rol_admin = Rol.objects.get(codigo="administrador")
        datos = dict(self.REGISTRO, rol=rol_admin.id, sitios=[1])
        r = self.client.post("/api/registro/", datos, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Usuario.objects.get(username="atacante@test.com").rol.codigo, "cliente")
        self.assertFalse(Usuario.objects.filter(rol=rol_admin).exists())


class RegistroPublicoPasswordTests(APITestCase):
    """POST /api/registro/ valida la contraseña con AUTH_PASSWORD_VALIDATORS."""

    BASE = {"tipo": "natural", "nombre": "Carolina Méndez", "identificacion": "1045678",
            "email": "carolina.mendez@example.com", "ciudad": "CTG"}

    def registrar(self, **cambios):
        return self.client.post("/api/registro/", dict(self.BASE, **cambios), format="json")

    def assertPasswordRechazada(self, respuesta, fragmento):
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        errores = respuesta.json()["password"]
        self.assertIsInstance(errores, list)
        self.assertTrue(any(fragmento in e for e in errores), errores)
        self.assertFalse(Usuario.objects.filter(username=self.BASE["email"]).exists())

    def test_contrasena_corta(self):
        self.assertPasswordRechazada(self.registrar(password="Ab1#xyz"), "al menos 8 caracteres")

    def test_contrasena_solo_numerica(self):
        self.assertPasswordRechazada(self.registrar(password="83920174562"), "completamente numérica")

    def test_contrasena_comun(self):
        self.assertPasswordRechazada(self.registrar(password="password123"), "demasiado común")

    def test_contrasena_parecida_al_correo(self):
        self.assertPasswordRechazada(self.registrar(password="carolina.mendez"), "muy parecida a nombre de usuario")

    def test_contrasena_parecida_al_nombre(self):
        # Correo sin relación con la contraseña: solo puede fallar por el nombre.
        r = self.registrar(email="xk93qz@dominio.test", password="Carolina2026")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.json()["password"], ["La contraseña es muy parecida a nombre."])
        self.assertFalse(Usuario.objects.filter(username="xk93qz@dominio.test").exists())

    def test_contrasena_valida_registra_un_cliente(self):
        r = self.registrar(password=PASSWORD)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Usuario.objects.get(username=self.BASE["email"]).rol.codigo, "cliente")

    def test_rol_administrador_en_el_payload_se_ignora(self):
        r = self.registrar(password=PASSWORD, rol="administrador")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Usuario.objects.get(username=self.BASE["email"]).rol.codigo, "cliente")
        self.assertFalse(Usuario.objects.filter(rol__codigo="administrador").exists())

    def test_errores_de_correo_duplicado_y_password_llegan_juntos(self):
        crear_usuario(self.BASE["email"], "cliente")
        r = self.registrar(password="83920174562")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        cuerpo = r.json()
        self.assertIn("email", cuerpo)
        self.assertIsInstance(cuerpo["password"], list)


def detalle(pk):
    return f"/api/usuarios/{pk}/"


class BaseUsuariosAdminTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.otro_admin = crear_usuario("otro_admin@test.com", "administrador")
        cls.cliente_user = crear_usuario("cliente@test.com", "cliente")
        cls.proveedor = crear_usuario("proveedor@test.com", "proveedor")
        cls.rol_admin = Rol.objects.get(codigo="administrador")
        cls.rol_cliente = Rol.objects.get(codigo="cliente")
        cls.rol_proveedor = Rol.objects.get(codigo="proveedor")

    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def usernames(self, url="/api/usuarios/"):
        respuesta = self.client.get(url)
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        return sorted(u["username"] for u in respuesta.json())

    def vincular_cliente(self, usuario=None):
        return Cliente.objects.create(
            tipo=Cliente.NATURAL, nombre="Ana", identificacion="123",
            usuario=usuario or self.cliente_user,
        )


class MatrizDetalleUsuarioTests(BaseUsuariosAdminTests):
    """Rol x método sobre /api/usuarios/<pk>/ (mismo patrón que SEG-001)."""

    def test_sin_token_recibe_401(self):
        self.client.force_authenticate(user=None)
        for metodo in ("get", "patch", "delete"):
            with self.subTest(metodo=metodo):
                respuesta = getattr(self.client, metodo)(detalle(self.proveedor.pk))
                self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cliente_y_proveedor_reciben_403(self):
        for usuario in (self.cliente_user, self.proveedor):
            self.client.force_authenticate(user=usuario)
            for metodo in ("get", "patch", "delete"):
                with self.subTest(rol=usuario.rol.codigo, metodo=metodo):
                    respuesta = getattr(self.client, metodo)(detalle(self.otro_admin.pk))
                    self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        self.otro_admin.refresh_from_db()
        self.assertTrue(self.otro_admin.is_active)


class ListaUsuariosTests(BaseUsuariosAdminTests):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.carla = Usuario.objects.create_user(
            username="carla", password=PASSWORD, rol=cls.rol_proveedor,
            first_name="Carla", last_name="Mora", email="carla@correo.com")
        cls.carlos_baja = Usuario.objects.create_user(
            username="carlos_baja", password=PASSWORD, rol=cls.rol_proveedor,
            first_name="Carlos", email="carlos@correo.com", is_active=False)
        cls.luis_baja = Usuario.objects.create_user(
            username="luis_baja", password=PASSWORD, rol=cls.rol_admin, is_active=False)

    def test_por_defecto_solo_activos(self):
        self.assertEqual(
            self.usernames(),
            ["admin@test.com", "carla", "cliente@test.com", "otro_admin@test.com", "proveedor@test.com"])

    def test_incluir_inactivos(self):
        nombres = self.usernames("/api/usuarios/?incluir_inactivos=true")
        self.assertIn("carlos_baja", nombres)
        self.assertIn("luis_baja", nombres)

    def test_search_por_username_nombre_apellido_y_correo(self):
        for consulta in ("carla", "Carla", "Mora", "carla@correo"):
            with self.subTest(search=consulta):
                self.assertEqual(self.usernames(f"/api/usuarios/?search={consulta}"), ["carla"])

    def test_filtro_por_rol(self):
        self.assertEqual(self.usernames("/api/usuarios/?rol=proveedor"), ["carla", "proveedor@test.com"])
        self.assertEqual(self.usernames("/api/usuarios/?rol=inexistente"), [])

    def test_search_y_rol_combinados_con_incluir_inactivos(self):
        base = "/api/usuarios/?search=carl&rol=proveedor"
        self.assertEqual(self.usernames(base), ["carla"])
        self.assertEqual(self.usernames(base + "&incluir_inactivos=true"), ["carla", "carlos_baja"])

    def test_rol_e_incluir_inactivos_combinados(self):
        url = "/api/usuarios/?rol=administrador&incluir_inactivos=true"
        self.assertEqual(self.usernames(url), ["admin@test.com", "luis_baja", "otro_admin@test.com"])
        self.assertEqual(self.usernames(url + "&search=luis"), ["luis_baja"])

    def test_respuesta_no_expone_password_ni_banderas_de_privilegio(self):
        usuario = self.client.get("/api/usuarios/").json()[0]
        for campo in ("password", "is_superuser", "is_staff", "groups", "user_permissions"):
            self.assertNotIn(campo, usuario)
        self.assertIn(usuario["rol_codigo"], ("administrador", "cliente", "proveedor"))

    def test_post_en_la_lista_crea_usuario_interno(self):
        respuesta = self.client.post("/api/usuarios/", {
            "username": "nuevo@test.com", "email": "nuevo@test.com", "password": PASSWORD,
            "rol": self.rol_proveedor.id, "sitios": []}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Usuario.objects.get(username="nuevo@test.com").rol, self.rol_proveedor)
        self.assertNotIn("password", respuesta.json())


class EdicionUsuarioTests(BaseUsuariosAdminTests):
    def test_get_detalle_incluye_inactivos(self):
        self.proveedor.is_active = False
        self.proveedor.save()
        respuesta = self.client.get(detalle(self.proveedor.pk))
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertFalse(respuesta.json()["is_active"])

    def test_patch_edita_campos_permitidos(self):
        respuesta = self.client.patch(detalle(self.proveedor.pk), {
            "first_name": "Pepe", "email": "pepe@correo.com", "rol": self.rol_admin.id}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.proveedor.refresh_from_db()
        self.assertEqual(self.proveedor.first_name, "Pepe")
        self.assertEqual(self.proveedor.rol, self.rol_admin)

    def test_patch_ignora_privilegios_y_contrasena(self):
        respuesta = self.client.patch(detalle(self.proveedor.pk), {
            "is_superuser": True, "is_staff": True, "password": "Otra-Clave-999",
            "groups": [], "user_permissions": [], "first_name": "Pepe"}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.proveedor.refresh_from_db()
        self.assertFalse(self.proveedor.is_superuser)
        self.assertFalse(self.proveedor.is_staff)
        self.assertTrue(self.proveedor.check_password(PASSWORD))
        self.assertFalse(self.proveedor.check_password("Otra-Clave-999"))

    def test_patch_username_repetido_da_400_bajo_username(self):
        respuesta = self.client.patch(
            detalle(self.proveedor.pk), {"username": "cliente@test.com"}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", respuesta.json())
        self.proveedor.refresh_from_db()
        self.assertEqual(self.proveedor.username, "proveedor@test.com")

    def test_patch_puede_reactivar_usuario(self):
        self.proveedor.is_active = False
        self.proveedor.save()
        respuesta = self.client.patch(detalle(self.proveedor.pk), {"is_active": True}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.proveedor.refresh_from_db()
        self.assertTrue(self.proveedor.is_active)


class BajaLogicaUsuarioTests(BaseUsuariosAdminTests):
    def test_delete_es_baja_logica(self):
        respuesta = self.client.delete(detalle(self.proveedor.pk))
        self.assertEqual(respuesta.status_code, status.HTTP_204_NO_CONTENT)
        self.proveedor.refresh_from_db()
        self.assertFalse(self.proveedor.is_active)
        self.assertNotIn("proveedor@test.com", self.usernames())

    def test_delete_repetido_es_idempotente(self):
        self.client.delete(detalle(self.proveedor.pk))
        self.assertEqual(self.client.delete(detalle(self.proveedor.pk)).status_code,
                         status.HTTP_204_NO_CONTENT)

    def test_token_de_un_usuario_dado_de_baja_deja_de_servir(self):
        self.client.force_authenticate(user=None)
        r = self.client.post("/api/token/", {"username": "proveedor@test.com", "password": PASSWORD},
                             format="json")
        token = r.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(self.client.get("/api/usuarios/me/").status_code, status.HTTP_200_OK)

        self.client.credentials()
        self.client.force_authenticate(user=self.admin)
        self.client.delete(detalle(self.proveedor.pk))

        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(self.client.get("/api/usuarios/me/").status_code, status.HTTP_401_UNAUTHORIZED)


class ReglasDeSeguridadUsuarioTests(BaseUsuariosAdminTests):
    def test_admin_no_puede_darse_de_baja_a_si_mismo(self):
        respuesta = self.client.delete(detalle(self.admin.pk))
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No puedes darte de baja", respuesta.json()["detail"])
        respuesta = self.client.patch(detalle(self.admin.pk), {"is_active": False}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("is_active", respuesta.json())
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_admin_no_puede_quitarse_el_rol_a_si_mismo(self):
        respuesta = self.client.patch(detalle(self.admin.pk), {"rol": self.rol_proveedor.id}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rol", respuesta.json())
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.rol, self.rol_admin)

    def test_admin_si_puede_editar_otros_datos_propios(self):
        respuesta = self.client.patch(
            detalle(self.admin.pk), {"first_name": "Yo", "rol": self.rol_admin.id}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)

    def test_admin_puede_dar_de_baja_a_otro_admin_si_queda_uno_activo(self):
        respuesta = self.client.delete(detalle(self.otro_admin.pk))
        self.assertEqual(respuesta.status_code, status.HTTP_204_NO_CONTENT)

    def test_no_se_deja_sin_administradores_activos(self):
        """Defensa en profundidad: con un actor admin inactivo (que el login JWT ya
        rechazaría) se intenta dar de baja al único administrador activo."""
        unico = crear_usuario("unico@test.com", "administrador")
        for inactivo in (self.admin, self.otro_admin):
            inactivo.is_active = False
            inactivo.save()
        self.client.force_authenticate(user=self.admin)  # actor

        respuesta = self.client.delete(detalle(unico.pk))
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("último administrador activo", respuesta.json()["detail"])

        respuesta = self.client.patch(detalle(unico.pk), {"rol": self.rol_proveedor.id}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("último administrador activo", respuesta.json()["rol"][0])

        unico.refresh_from_db()
        self.assertTrue(unico.is_active)
        self.assertEqual(unico.rol, self.rol_admin)

    def test_servicio_rechaza_quitar_al_ultimo_admin_sin_actor(self):
        self.otro_admin.is_active = False
        self.otro_admin.save()
        with self.assertRaises(ValidationError):
            validar_cambio_usuario(self.admin, None, nuevo_activo=False)
        validar_cambio_usuario(self.proveedor, None, nuevo_activo=False)  # no es admin: pasa

    def test_superusuario_no_se_toca_desde_la_api(self):
        super_user = Usuario.objects.create_superuser(
            username="root", email="root@test.com", password=PASSWORD, rol=self.rol_admin)
        casos = [
            ("delete", None, "detail"),
            ("patch", {"is_active": False}, "is_active"),
            ("patch", {"rol": self.rol_proveedor.id}, "rol"),
        ]
        for metodo, cuerpo, campo in casos:
            with self.subTest(metodo=metodo, cuerpo=cuerpo):
                if cuerpo is None:
                    respuesta = getattr(self.client, metodo)(detalle(super_user.pk))
                else:
                    respuesta = getattr(self.client, metodo)(detalle(super_user.pk), cuerpo, format="json")
                self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
                mensaje = respuesta.json()[campo]
                mensaje = mensaje if isinstance(mensaje, str) else mensaje[0]
                self.assertIn("panel de administración de Django", mensaje)
        super_user.refresh_from_db()
        self.assertTrue(super_user.is_active)
        self.assertEqual(super_user.rol, self.rol_admin)

    def test_no_se_cambia_el_rol_de_un_usuario_con_cliente(self):
        self.vincular_cliente()
        respuesta = self.client.patch(detalle(self.cliente_user.pk), {"rol": self.rol_proveedor.id},
                                      format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.json()["rol"], [MSG_ROL_CON_CLIENTE])
        self.cliente_user.refresh_from_db()
        self.assertEqual(self.cliente_user.rol, self.rol_cliente)

    def test_no_se_asigna_el_rol_cliente_a_un_usuario_interno(self):
        respuesta = self.client.patch(detalle(self.proveedor.pk), {"rol": self.rol_cliente.id},
                                      format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.json()["rol"], [MSG_ROL_CLIENTE])
        self.proveedor.refresh_from_db()
        self.assertEqual(self.proveedor.rol, self.rol_proveedor)

    def test_enviar_el_mismo_rol_a_un_usuario_con_cliente_no_es_un_cambio(self):
        self.vincular_cliente()
        respuesta = self.client.patch(
            detalle(self.cliente_user.pk), {"rol": self.rol_cliente.id, "first_name": "Ana"}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)


class BajaUsuarioYClienteIdaYVueltaTests(BaseUsuariosAdminTests):
    """La baja/reactivación se propaga en los dos sentidos sin recursión infinita."""

    def estado(self, cliente):
        cliente.refresh_from_db()
        cliente.usuario.refresh_from_db()
        return cliente.activo, cliente.usuario.is_active

    def test_baja_y_reactivacion_del_usuario_por_la_api_arrastra_al_cliente(self):
        cliente = self.vincular_cliente()
        self.assertEqual(self.client.delete(detalle(self.cliente_user.pk)).status_code,
                         status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.estado(cliente), (False, False))

        respuesta = self.client.patch(detalle(self.cliente_user.pk), {"is_active": True}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(self.estado(cliente), (True, True))

    def test_ida_y_vuelta_desde_los_metodos_del_modelo(self):
        cliente = self.vincular_cliente()
        for activo in (False, True, False, True):
            with self.subTest(origen="usuario", activo=activo):
                Usuario.objects.get(pk=self.cliente_user.pk).set_activo(activo)
                self.assertEqual(self.estado(cliente), (activo, activo))
        for activo in (False, True, False, True):
            with self.subTest(origen="cliente", activo=activo):
                Cliente.objects.get(pk=cliente.pk).set_activo(activo)
                self.assertEqual(self.estado(cliente), (activo, activo))

    def test_baja_del_cliente_por_la_api_de_clientes_desactiva_al_usuario(self):
        cliente = self.vincular_cliente()
        self.client.delete(f"/api/clientes/{cliente.pk}/")
        self.assertEqual(self.estado(cliente), (False, False))
        respuesta = self.client.get("/api/usuarios/?incluir_inactivos=true")
        inactivos = [u["username"] for u in respuesta.json() if not u["is_active"]]
        self.assertIn("cliente@test.com", inactivos)

    def test_usuario_sin_cliente_no_falla(self):
        self.proveedor.set_activo(False)
        self.proveedor.refresh_from_db()
        self.assertFalse(self.proveedor.is_active)

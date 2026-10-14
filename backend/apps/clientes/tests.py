from datetime import date, timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cotizaciones.models import Cotizacion
from apps.salones.models import Montaje, Salon
from apps.sitios.models import Ciudad, Sitio
from apps.usuarios.models import Rol, Usuario

from .models import Cliente, Empresa

PASSWORD = "Clave-Segura-123"
LISTA = "/api/clientes/"


def crear_usuario(username, codigo_rol):
    rol = Rol.objects.get(codigo=codigo_rol)
    return Usuario.objects.create_user(username=username, password=PASSWORD, rol=rol)


def detalle(pk):
    return f"/api/clientes/{pk}/"


class BaseClientesTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = crear_usuario("admin@test.com", "administrador")
        cls.cliente_user = crear_usuario("cliente@test.com", "cliente")
        cls.proveedor_user = crear_usuario("proveedor@test.com", "proveedor")
        cls.ciudad = Ciudad.objects.get(codigo="CTG")
        cls.empresa = Empresa.objects.create(
            razon_social="Eventos SAS", identificacion="900123", ciudad=cls.ciudad
        )

    def crear_natural(self, nombre="Ana", identificacion="123", **extra):
        return Cliente.objects.create(
            tipo=Cliente.NATURAL, nombre=nombre, identificacion=identificacion, **extra
        )

    def crear_juridico(self, nombre="Contacto Empresa"):
        return Cliente.objects.create(tipo=Cliente.JURIDICA, nombre=nombre, empresa=self.empresa)

    def ids_del_listado(self, url=LISTA):
        respuesta = self.client.get(url)
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        return [c["id"] for c in respuesta.json()]


class MatrizDetalleClienteTests(BaseClientesTests):
    """Rol x método sobre /api/clientes/<pk>/ (mismo patrón que SEG-001 / SEG-006)."""

    def llamar(self, metodo, pk):
        cuerpo = {"tipo": "natural", "nombre": "Editado", "identificacion": "123"}
        if metodo == "get":
            return self.client.get(detalle(pk))
        if metodo == "delete":
            return self.client.delete(detalle(pk))
        return getattr(self.client, metodo)(detalle(pk), cuerpo, format="json")

    def test_sin_token_recibe_401(self):
        cliente = self.crear_natural()
        for metodo in ("get", "put", "patch", "delete"):
            with self.subTest(metodo=metodo):
                self.assertEqual(self.llamar(metodo, cliente.pk).status_code,
                                 status.HTTP_401_UNAUTHORIZED)

    def test_cliente_y_proveedor_reciben_403(self):
        cliente = self.crear_natural()
        for usuario in (self.cliente_user, self.proveedor_user):
            self.client.force_authenticate(user=usuario)
            for metodo in ("get", "put", "patch", "delete"):
                with self.subTest(rol=usuario.rol.codigo, metodo=metodo):
                    self.assertEqual(self.llamar(metodo, cliente.pk).status_code,
                                     status.HTTP_403_FORBIDDEN)
        cliente.refresh_from_db()
        self.assertTrue(cliente.activo)
        self.assertEqual(cliente.nombre, "Ana")

    def test_administrador_puede_usar_todos_los_metodos(self):
        cliente = self.crear_natural()
        self.client.force_authenticate(user=self.admin)
        esperado = {"get": 200, "put": 200, "patch": 200, "delete": 204}
        for metodo, codigo in esperado.items():
            with self.subTest(metodo=metodo):
                self.assertEqual(self.llamar(metodo, cliente.pk).status_code, codigo)

    def test_detalle_de_cliente_inexistente_da_404(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get(detalle(99999)).status_code, status.HTTP_404_NOT_FOUND)


class BorradoLogicoTests(BaseClientesTests):
    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def test_delete_marca_inactivo_y_no_borra_la_fila(self):
        cliente = self.crear_natural()
        self.assertEqual(self.client.delete(detalle(cliente.pk)).status_code,
                         status.HTTP_204_NO_CONTENT)
        cliente.refresh_from_db()  # sigue existiendo
        self.assertFalse(cliente.activo)

    def test_inactivo_desaparece_del_listado_por_defecto(self):
        cliente = self.crear_natural()
        self.assertIn(cliente.pk, self.ids_del_listado())
        self.client.delete(detalle(cliente.pk))
        self.assertNotIn(cliente.pk, self.ids_del_listado())

    def test_incluir_inactivos_los_muestra(self):
        cliente = self.crear_natural()
        self.client.delete(detalle(cliente.pk))
        self.assertIn(cliente.pk, self.ids_del_listado(LISTA + "?incluir_inactivos=true"))

    def test_el_detalle_de_un_inactivo_sigue_visible(self):
        cliente = self.crear_natural()
        self.client.delete(detalle(cliente.pk))
        respuesta = self.client.get(detalle(cliente.pk))
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertFalse(respuesta.json()["activo"])

    def test_borrar_dos_veces_es_idempotente(self):
        cliente = self.crear_natural()
        self.client.delete(detalle(cliente.pk))
        self.assertEqual(self.client.delete(detalle(cliente.pk)).status_code,
                         status.HTTP_204_NO_CONTENT)

    def test_cliente_con_cotizaciones_no_revienta_con_500(self):
        """Cotizacion.cliente es PROTECT: un borrado físico fallaría."""
        cliente = self.crear_natural()
        sitio = Sitio.objects.create(nombre="Hotel Test", ciudad=self.ciudad)
        salon = Salon.objects.create(sitio=sitio, nombre="Salón Test")
        Cotizacion.objects.create(
            sitio=sitio, cliente=cliente, usuario=self.admin, salon=salon,
            montaje=Montaje.objects.first(), fecha_evento=date(2026, 12, 1), cantidad_personas=50,
        )
        self.assertEqual(self.client.delete(detalle(cliente.pk)).status_code,
                         status.HTTP_204_NO_CONTENT)
        self.assertEqual(Cotizacion.objects.filter(cliente=cliente).count(), 1)
        cliente.refresh_from_db()
        self.assertFalse(cliente.activo)


class ReactivacionYUsuarioVinculadoTests(BaseClientesTests):
    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.usuario = crear_usuario("auto@test.com", "cliente")
        self.cliente = self.crear_natural(nombre="Auto", identificacion="555", usuario=self.usuario)

    def test_delete_desactiva_el_usuario_vinculado(self):
        self.client.delete(detalle(self.cliente.pk))
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.is_active)

    def test_el_usuario_desactivado_ya_no_puede_iniciar_sesion(self):
        self.client.delete(detalle(self.cliente.pk))
        self.client.force_authenticate(user=None)
        respuesta = self.client.post(
            "/api/token/", {"username": "auto@test.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reactivar_vuelve_a_activar_al_usuario(self):
        self.client.delete(detalle(self.cliente.pk))
        respuesta = self.client.patch(detalle(self.cliente.pk), {"activo": True}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.cliente.refresh_from_db()
        self.usuario.refresh_from_db()
        self.assertTrue(self.cliente.activo)
        self.assertTrue(self.usuario.is_active)
        self.assertIn(self.cliente.pk, self.ids_del_listado())

    def test_cliente_sin_usuario_se_puede_desactivar_y_reactivar(self):
        sin_usuario = self.crear_natural(nombre="Manual", identificacion="777")
        self.assertEqual(self.client.delete(detalle(sin_usuario.pk)).status_code, 204)
        self.assertEqual(
            self.client.patch(detalle(sin_usuario.pk), {"activo": True}, format="json").status_code, 200
        )

    def test_put_sin_el_campo_activo_no_reactiva(self):
        """activo tiene default=True: un PUT que no lo envía no debe resetearlo."""
        self.client.delete(detalle(self.cliente.pk))
        cuerpo = {"tipo": "natural", "nombre": "Nombre nuevo", "identificacion": "555"}
        respuesta = self.client.put(detalle(self.cliente.pk), cuerpo, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.cliente.refresh_from_db()
        self.usuario.refresh_from_db()
        self.assertEqual(self.cliente.nombre, "Nombre nuevo")
        self.assertFalse(self.cliente.activo)
        self.assertFalse(self.usuario.is_active)

    def test_patch_de_otro_campo_no_reactiva(self):
        self.client.delete(detalle(self.cliente.pk))
        self.client.patch(detalle(self.cliente.pk), {"telefono": "300"}, format="json")
        self.cliente.refresh_from_db()
        self.assertFalse(self.cliente.activo)


class EmpresaObligatoriaAlEditarTests(BaseClientesTests):
    def setUp(self):
        self.client.force_authenticate(user=self.admin)
        self.juridico = self.crear_juridico()

    def assertSigueConEmpresa(self):
        self.juridico.refresh_from_db()
        self.assertEqual(self.juridico.empresa_id, self.empresa.pk)

    def test_put_que_envia_empresa_null_a_un_juridico_da_400(self):
        respuesta = self.client.put(
            detalle(self.juridico.pk),
            {"tipo": "juridica", "nombre": "X", "empresa": None},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("empresa", respuesta.json())
        self.assertSigueConEmpresa()

    def test_put_que_omite_empresa_conserva_la_guardada(self):
        """En DRF omitir un campo opcional no lo borra: el jurídico sigue con su empresa."""
        respuesta = self.client.put(
            detalle(self.juridico.pk), {"tipo": "juridica", "nombre": "X"}, format="json"
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertSigueConEmpresa()

    def test_patch_que_quita_la_empresa_a_un_juridico_da_400(self):
        """El caso que antes se colaba: tipo no viene en el payload."""
        respuesta = self.client.patch(detalle(self.juridico.pk), {"empresa": None}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("empresa", respuesta.json())
        self.assertSigueConEmpresa()

    def test_patch_de_otro_campo_en_un_juridico_con_empresa_funciona(self):
        respuesta = self.client.patch(detalle(self.juridico.pk), {"telefono": "300"}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)

    def test_patch_a_juridica_con_empresa_ya_guardada_no_da_falso_error(self):
        respuesta = self.client.patch(detalle(self.juridico.pk), {"tipo": "juridica"}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)

    def test_cambiar_un_natural_a_juridico_sin_empresa_da_400(self):
        natural = self.crear_natural()
        respuesta = self.client.patch(detalle(natural.pk), {"tipo": "juridica"}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        natural.refresh_from_db()
        self.assertEqual(natural.tipo, Cliente.NATURAL)


class IdentificacionDuplicadaTests(BaseClientesTests):
    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def cuerpo(self, identificacion):
        return {"tipo": "natural", "nombre": "Otro", "identificacion": identificacion}

    def test_duplicada_con_cliente_activo(self):
        self.crear_natural(identificacion="999")
        respuesta = self.client.post(LISTA, self.cuerpo("999"), format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        mensaje = respuesta.json()["identificacion"][0]
        self.assertIn("Ya existe un cliente con esa identificación", mensaje)
        self.assertNotIn("inactivo", mensaje)

    def test_duplicada_con_cliente_inactivo_lo_dice_y_sugiere_reactivar(self):
        inactivo = self.crear_natural(identificacion="999")
        self.client.delete(detalle(inactivo.pk))
        respuesta = self.client.post(LISTA, self.cuerpo("999"), format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        mensaje = respuesta.json()["identificacion"][0]
        self.assertIn("inactivo", mensaje)
        self.assertIn("reactivar", mensaje)
        self.assertIn(str(inactivo.pk), mensaje)

    def test_duplicada_con_cliente_inactivo_trae_su_id_en_un_campo(self):
        """SGDE-107: cliente_inactivo con el id, además del mensaje de siempre."""
        inactivo = self.crear_natural(identificacion="999")
        self.client.delete(detalle(inactivo.pk))
        for metodo, url in (("post", LISTA), ("patch", detalle(self.crear_natural(nombre="B", identificacion="555").pk))):
            with self.subTest(metodo=metodo):
                respuesta = getattr(self.client, metodo)(url, self.cuerpo("999"), format="json")
                self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(respuesta.json()["cliente_inactivo"], inactivo.pk)
                self.assertIn(f"(id {inactivo.pk})", respuesta.json()["identificacion"][0])

    def test_duplicada_con_cliente_activo_no_trae_cliente_inactivo(self):
        self.crear_natural(identificacion="999")
        respuesta = self.client.post(LISTA, self.cuerpo("999"), format="json")
        self.assertNotIn("cliente_inactivo", respuesta.json())

    def test_editar_un_cliente_conservando_su_propia_identificacion_funciona(self):
        cliente = self.crear_natural(identificacion="999")
        respuesta = self.client.patch(
            detalle(cliente.pk), {"identificacion": "999", "nombre": "Nuevo"}, format="json"
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)

    def test_editar_con_la_identificacion_de_otro_da_400(self):
        self.crear_natural(identificacion="111")
        cliente = self.crear_natural(nombre="B", identificacion="222")
        respuesta = self.client.patch(detalle(cliente.pk), {"identificacion": "111"}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_search_no_filtra_por_activo(self):
        """?search= sigue igual: no incluye inactivos salvo que se pida."""
        cliente = self.crear_natural(nombre="Buscable", identificacion="321")
        self.client.delete(detalle(cliente.pk))
        self.assertNotIn(cliente.pk, self.ids_del_listado(LISTA + "?search=Buscable"))
        self.assertIn(
            cliente.pk, self.ids_del_listado(LISTA + "?search=Buscable&incluir_inactivos=true")
        )


class IdentificacionJuridicoTests(BaseClientesTests):
    """SGDE-87: el NIT de un jurídico vive en su Empresa; Cliente.identificacion queda en null."""

    MENSAJE = "Un cliente jurídico no lleva identificación: el NIT es el de su empresa."

    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def cuerpo_juridico(self, **extra):
        return {"tipo": "juridica", "nombre": "Contacto", "empresa": self.empresa.pk, **extra}

    def assertIdentificacionNula(self, cliente_id):
        self.assertIsNone(Cliente.objects.get(pk=cliente_id).identificacion)

    # --- Crear (POST) ---

    def test_post_juridico_con_identificacion_da_400(self):
        respuesta = self.client.post(LISTA, self.cuerpo_juridico(identificacion="900123"), format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.json()["identificacion"][0], self.MENSAJE)
        self.assertFalse(Cliente.objects.filter(tipo=Cliente.JURIDICA).exists())

    def test_post_juridico_con_identificacion_de_otro_da_el_mensaje_de_juridico(self):
        # La regla del jurídico gana al aviso de identificación repetida.
        self.crear_natural(identificacion="555")
        respuesta = self.client.post(LISTA, self.cuerpo_juridico(identificacion="555"), format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.json()["identificacion"][0], self.MENSAJE)

    def test_post_juridico_sin_identificacion_crea_con_null(self):
        respuesta = self.client.post(LISTA, self.cuerpo_juridico(), format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(respuesta.json()["identificacion"])
        self.assertIdentificacionNula(respuesta.json()["id"])

    def test_post_juridico_con_identificacion_vacia_o_null_crea_con_null(self):
        for valor in ["", None, "   "]:
            with self.subTest(valor=valor):
                respuesta = self.client.post(
                    LISTA, self.cuerpo_juridico(identificacion=valor), format="json"
                )
                self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
                self.assertIdentificacionNula(respuesta.json()["id"])

    # --- Editar (PATCH) ---

    def test_patch_natural_a_juridico_sin_enviar_identificacion_la_deja_null(self):
        # Lo que hace la pantalla: payloadEdicion no envía identificacion en jurídica.
        natural = self.crear_natural(identificacion="123")
        respuesta = self.client.patch(
            detalle(natural.pk), {"tipo": "juridica", "empresa": self.empresa.pk}, format="json"
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertIsNone(respuesta.json()["identificacion"])
        self.assertIdentificacionNula(natural.pk)

    def test_patch_juridico_enviando_identificacion_da_400(self):
        juridico = self.crear_juridico()
        respuesta = self.client.patch(detalle(juridico.pk), {"identificacion": "777"}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.json()["identificacion"][0], self.MENSAJE)
        self.assertIdentificacionNula(juridico.pk)

    def test_patch_de_otro_campo_en_juridico_conserva_la_identificacion_nula(self):
        # El "jurídico viejo con NIT" ya no puede existir: lo limpió la migración 0007
        # y lo impide el constraint (ver ReglaNitEnBaseDeDatosTests, SGDE-91).
        juridico = self.crear_juridico()
        respuesta = self.client.patch(detalle(juridico.pk), {"telefono": "3001112233"}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        juridico.refresh_from_db()
        self.assertIsNone(juridico.identificacion)
        self.assertEqual(juridico.telefono, "3001112233")

    # --- Natural: sin cambios ---

    def test_natural_se_crea_con_su_identificacion(self):
        respuesta = self.client.post(
            LISTA, {"tipo": "natural", "nombre": "Ana", "identificacion": "1047000111"}, format="json"
        )
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.json()["identificacion"], "1047000111")

    def test_natural_editado_sin_tocar_la_identificacion_la_conserva(self):
        natural = self.crear_natural(identificacion="1047000111")
        respuesta = self.client.patch(detalle(natural.pk), {"telefono": "3005556677"}, format="json")
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        natural.refresh_from_db()
        self.assertEqual(natural.identificacion, "1047000111")

    def test_natural_con_identificacion_vacia_se_guarda_null_y_no_choca(self):
        # SGDE-91: antes se guardaba "" y el segundo natural sin documento chocaba con el unique.
        for nombre in ("Sin documento 1", "Sin documento 2"):
            with self.subTest(nombre=nombre):
                respuesta = self.client.post(
                    LISTA, {"tipo": "natural", "nombre": nombre, "identificacion": ""}, format="json"
                )
                self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
                self.assertIdentificacionNula(respuesta.json()["id"])


class ReglaNitEnBaseDeDatosTests(BaseClientesTests):
    """SGDE-91: la regla del NIT del jurídico también vale fuera del API."""

    def test_constraint_rechaza_juridico_con_identificacion_guardado_directo(self):
        for valor in ("900999", ""):
            with self.subTest(valor=valor):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    Cliente.objects.create(
                        tipo=Cliente.JURIDICA, nombre="Directo", identificacion=valor, empresa=self.empresa
                    )

    def test_constraint_admite_juridico_sin_identificacion_y_natural_con_ella(self):
        self.crear_juridico()
        self.crear_natural(identificacion="1047000111")
        self.assertEqual(Cliente.objects.count(), 2)

    def test_clean_pone_el_error_en_identificacion_una_sola_vez(self):
        cliente = Cliente(tipo=Cliente.JURIDICA, nombre="X", identificacion="900999", empresa=self.empresa)
        with self.assertRaises(ValidationError) as error:
            cliente.full_clean()
        # Solo bajo el campo: el constraint no repite el error como error general.
        self.assertEqual(error.exception.message_dict, {"identificacion": [Cliente.MSG_JURIDICO_CON_IDENTIFICACION]})


class ClienteAdminTests(BaseClientesTests):
    """SGDE-91: el admin de Django muestra el error del NIT bajo el campo."""

    URL_CREAR = "/admin/clientes/cliente/add/"

    def setUp(self):
        superusuario = Usuario.objects.create_superuser(
            username="super@test.com", password=PASSWORD, rol=Rol.objects.get(codigo="administrador")
        )
        self.client.force_login(superusuario)

    def formulario(self, **extra):
        return {
            "tipo": "juridica", "nombre": "Contacto admin", "identificacion": "", "telefono": "",
            "correo": "", "empresa": self.empresa.pk, "forma_pago": "", "observaciones_internas": "",
            "activo": "on", **extra,
        }

    def test_juridico_con_identificacion_muestra_el_error_bajo_el_campo(self):
        respuesta = self.client.post(self.URL_CREAR, self.formulario(identificacion="900999"))
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        errores = respuesta.context["adminform"].form.errors
        self.assertEqual(errores["identificacion"], [Cliente.MSG_JURIDICO_CON_IDENTIFICACION])
        self.assertNotIn("__all__", errores)
        self.assertFalse(Cliente.objects.filter(nombre="Contacto admin").exists())

    def test_juridico_sin_identificacion_se_guarda_con_null(self):
        respuesta = self.client.post(self.URL_CREAR, self.formulario())
        self.assertEqual(respuesta.status_code, status.HTTP_302_FOUND)
        self.assertIsNone(Cliente.objects.get(nombre="Contacto admin").identificacion)


class MigracionLimpiezaIdentificacionTests(TransactionTestCase):
    """SGDE-91: la 0007 deja los datos listos para el constraint de la 0008.

    Baja clientes a la 0006 (sin la regla), siembra los casos y vuelve a subir.
    serialized_rollback: TransactionTestCase vacía la BD al terminar; así se
    restauran las semillas (roles, ciudades, montajes) para las pruebas siguientes.
    """

    serialized_rollback = True
    antes = [("clientes", "0006_cliente_activo")]
    despues = [("clientes", "0008_cliente_juridico_sin_identificacion")]

    def migrar(self, destino):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(destino)
        return executor.loader.project_state(destino).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    def sembrar_y_migrar(self, casos):
        """casos: {nombre: (tipo, identificacion)} → {nombre: identificacion tras la 0008}."""
        Cliente = self.migrar(self.antes).get_model("clientes", "Cliente")
        ids = {
            nombre: Cliente.objects.create(tipo=tipo, nombre=nombre, identificacion=ident).pk
            for nombre, (tipo, ident) in casos.items()
        }
        Cliente = self.migrar(self.despues).get_model("clientes", "Cliente")
        return {nombre: Cliente.objects.get(pk=pk).identificacion for nombre, pk in ids.items()}

    # El unique de identificacion solo admite un "" en toda la tabla: por eso el
    # jurídico con "" y el natural con "" van en escenarios separados.

    def test_limpia_el_juridico_con_nit_y_el_juridico_con_vacia(self):
        resultado = self.sembrar_y_migrar({
            "juridico_con_nit": ("juridica", "900111"),
            "juridico_vacio": ("juridica", ""),
            "natural_real": ("natural", "1047000111"),
        })
        self.assertEqual(resultado, {
            "juridico_con_nit": None, "juridico_vacio": None, "natural_real": "1047000111",
        })

    def test_limpia_el_natural_con_vacia_y_conserva_el_nit_real(self):
        resultado = self.sembrar_y_migrar({
            "juridico_con_nit": ("juridica", "900111"),
            "natural_vacio": ("natural", ""),
            "natural_real": ("natural", "1047000111"),
        })
        self.assertEqual(resultado, {
            "juridico_con_nit": None, "natural_vacio": None, "natural_real": "1047000111",
        })


class HistorialVencidasTests(BaseClientesTests):
    """SGDE-95: el historial del detalle del cliente marca las cotizaciones vencidas."""

    def test_marca_vencida_la_cotizada_vencida_y_no_la_confirmada(self):
        sitio = Sitio.objects.create(nombre="Hotel Test", ciudad=self.ciudad)
        self.admin.sitios.set([sitio])  # Sin sitios no vería ninguna cotización (SGDE-90).
        salon = Salon.objects.create(sitio=sitio, nombre="Salón Test")
        cliente = self.crear_natural()
        hoy = timezone.localdate()
        comunes = {
            "sitio": sitio, "cliente": cliente, "usuario": self.admin, "salon": salon,
            "montaje": Montaje.objects.first(), "cantidad_personas": 50,
            "fecha_evento": hoy + timedelta(days=30), "validez_oferta": hoy - timedelta(days=1),
        }
        vencida = Cotizacion.objects.create(estado="cotizado", **comunes)
        confirmada = Cotizacion.objects.create(estado="confirmado", **comunes)

        self.client.force_authenticate(user=self.admin)
        respuesta = self.client.get(detalle(cliente.pk))

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        historial = {c["id"]: c for c in respuesta.json()["cotizaciones"]}
        self.assertIs(historial[vencida.pk]["vencida"], True)
        self.assertIs(historial[confirmada.pk]["vencida"], False)
        self.assertEqual(historial[vencida.pk]["validez_oferta"], str(hoy - timedelta(days=1)))

from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from apps.catalogo.models import Concepto
from apps.clientes.models import Cliente, Empresa
from apps.salones.models import Salon, SalonMontaje
from apps.sitios.models import Ciudad, Sitio
from apps.usuarios.models import Usuario

from .management.commands.seed_demo import NIT_EMPRESA_DEMO


def sembrar(**kwargs):
    call_command("seed_demo", stdout=StringIO(), **kwargs)


def conteos():
    return {
        "usuarios": Usuario.objects.count(),
        "sitios": Sitio.objects.count(),
        "salones": Salon.objects.count(),
        "aforos": SalonMontaje.objects.count(),
        "conceptos": Concepto.objects.count(),
        "clientes": Cliente.objects.count(),
        "empresas": Empresa.objects.count(),
    }


@override_settings(DEBUG=True)
class SeedDemoTests(TestCase):
    def test_crea_los_datos_esperados(self):
        sembrar()
        self.assertEqual(Usuario.objects.get(username="admin").rol.codigo, "administrador")
        self.assertTrue(Usuario.objects.get(username="admin").is_superuser)
        self.assertEqual(Usuario.objects.get(username="cliente_demo").rol.codigo, "cliente")
        self.assertEqual(Usuario.objects.get(username="proveedor_demo").rol.codigo, "proveedor")
        self.assertEqual(Sitio.objects.get().ciudad.codigo, "CTG")
        self.assertEqual(Salon.objects.count(), 3)
        self.assertEqual(Concepto.objects.count(), 5)
        self.assertEqual(Cliente.objects.filter(tipo="natural").count(), 1)
        juridico = Cliente.objects.get(tipo="juridica")
        self.assertIsNotNone(juridico.empresa)

    def test_es_idempotente(self):
        sembrar()
        primero = conteos()
        sembrar()
        self.assertEqual(conteos(), primero)

    def test_juridico_sin_identificacion_y_nit_en_empresa(self):
        # SGDE-56: el NIT de un jurídico vive en Empresa; Cliente.identificacion queda en null.
        sembrar()
        juridico = Cliente.objects.get(tipo=Cliente.JURIDICA)
        self.assertIsNone(juridico.identificacion)
        self.assertEqual(juridico.empresa.identificacion, NIT_EMPRESA_DEMO)
        self.assertEqual(Cliente.objects.get(tipo=Cliente.NATURAL).identificacion, "1000000001")

    def test_dos_ejecuciones_no_duplican_clientes_ni_empresas(self):
        sembrar()
        sembrar()
        self.assertEqual(Cliente.objects.filter(tipo=Cliente.NATURAL).count(), 1)
        self.assertEqual(Cliente.objects.filter(tipo=Cliente.JURIDICA).count(), 1)
        self.assertEqual(Empresa.objects.filter(identificacion=NIT_EMPRESA_DEMO).count(), 1)
        self.assertEqual(Empresa.objects.count(), 1)

    def test_corrige_el_juridico_viejo_con_nit_repetido(self):
        # Así dejaba los datos el seed anterior: el NIT también en Cliente.identificacion.
        empresa = Empresa.objects.create(
            identificacion=NIT_EMPRESA_DEMO,
            razon_social="Eventos del Caribe S.A.S. (demo)",
            ciudad=Ciudad.objects.get(codigo="CTG"),
        )
        viejo = Cliente.objects.create(
            tipo=Cliente.JURIDICA,
            nombre="Eventos del Caribe S.A.S. (demo)",
            identificacion=NIT_EMPRESA_DEMO,
            empresa=empresa,
        )

        sembrar()

        juridicos = Cliente.objects.filter(tipo=Cliente.JURIDICA)
        self.assertEqual(juridicos.count(), 1)
        corregido = juridicos.get()
        self.assertEqual(corregido.pk, viejo.pk)
        self.assertIsNone(corregido.identificacion)
        self.assertEqual(corregido.empresa_id, empresa.pk)

    def test_usa_la_contrasena_de_la_variable_de_entorno(self):
        with mock.patch.dict("os.environ", {"SEED_ADMIN_PASSWORD": "clave-de-prueba-9"}):
            sembrar()
        self.assertTrue(Usuario.objects.get(username="admin").check_password("clave-de-prueba-9"))


class SeedDemoProduccionTests(TestCase):
    @override_settings(DEBUG=False)
    def test_se_niega_a_correr_con_debug_false(self):
        with self.assertRaises(CommandError):
            sembrar()
        self.assertEqual(Usuario.objects.count(), 0)

    @override_settings(DEBUG=False)
    def test_force_permite_correr_con_debug_false(self):
        sembrar(force=True)
        self.assertTrue(Usuario.objects.filter(username="admin").exists())

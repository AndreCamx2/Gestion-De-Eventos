from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from apps.catalogo.models import Concepto
from apps.clientes.models import Cliente, Empresa
from apps.salones.models import Salon, SalonMontaje
from apps.sitios.models import Sitio
from apps.usuarios.models import Usuario


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

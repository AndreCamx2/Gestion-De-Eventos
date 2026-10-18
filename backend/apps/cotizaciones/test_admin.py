from django.contrib import admin
from django.test import RequestFactory

from . import tests as base
from .models import Cotizacion


CAMPOS_SOLO_LECTURA = [
    "estado", "bloqueo_hasta",
    "garantia_tipo", "garantia_monto", "garantia_registrada_en", "garantia_registrada_por",
    "penalizacion_pct", "motivo_cancelacion", "cancelado_en", "cancelado_por",
]


class AdminCotizacionTests(base.CotizacionBaseTest):
    """SGDE-119: desde /admin/ no se puede cambiar el estado de una cotización a mano."""

    def setUp(self):
        self.model_admin = admin.site._registry[Cotizacion]
        superusuario = base.crear_usuario("super@test.com", "administrador")
        superusuario.is_staff = True
        superusuario.is_superuser = True
        superusuario.save()
        self.request = RequestFactory().get("/admin/")
        self.request.user = superusuario
        self.cotizacion = self.crear_en_bd()

    def test_los_campos_de_estado_son_de_solo_lectura(self):
        solo_lectura = self.model_admin.get_readonly_fields(self.request, self.cotizacion)
        for campo in CAMPOS_SOLO_LECTURA:
            with self.subTest(campo=campo):
                self.assertIn(campo, solo_lectura)

    def test_el_formulario_del_admin_no_acepta_esos_campos(self):
        
        for obj in (self.cotizacion, None):
            formulario = self.model_admin.get_form(self.request, obj)
            for campo in CAMPOS_SOLO_LECTURA:
                with self.subTest(campo=campo, editando=obj is not None):
                    self.assertNotIn(campo, formulario.base_fields)
from django.contrib import admin
from .models import Cotizacion, CotizacionItem, MovimientoCotizacion


class CotizacionItemInline(admin.TabularInline):
    model = CotizacionItem
    extra = 1


class MovimientoInline(admin.TabularInline):
    # Solo lectura: el historial lo escribe el API (SGDE-62), no se edita a mano.
    model = MovimientoCotizacion
    extra = 0
    fields = ["fecha", "tipo", "usuario", "detalle"]
    readonly_fields = fields
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class CotizacionAdmin(admin.ModelAdmin):
    inlines = [CotizacionItemInline, MovimientoInline]
    # El estado y todo lo que depende de él solo cambia por el API (estados.py), que aplica
    # las reglas (fecha libre, salón activo, vigencia) y deja su movimiento (SGDE-119, RNF-03).
    # Editarlos a mano en /admin/ se saltaba la máquina de estados.
    readonly_fields = [
        "estado", "bloqueo_hasta",
        "garantia_tipo", "garantia_monto", "garantia_registrada_en", "garantia_registrada_por",
        "penalizacion_pct", "motivo_cancelacion", "cancelado_en", "cancelado_por",
    ]


admin.site.register(Cotizacion, CotizacionAdmin)

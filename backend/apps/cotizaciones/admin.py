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
    # Los llenan los endpoints de aceptación y cancelación; no se editan a mano.
    readonly_fields = ["garantia_registrada_en", "garantia_registrada_por", "cancelado_en", "cancelado_por"]


admin.site.register(Cotizacion, CotizacionAdmin)

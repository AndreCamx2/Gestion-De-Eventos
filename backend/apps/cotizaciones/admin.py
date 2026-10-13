from django.contrib import admin
from .models import Cotizacion, CotizacionItem


class CotizacionItemInline(admin.TabularInline):
    model = CotizacionItem
    extra = 1


class CotizacionAdmin(admin.ModelAdmin):
    inlines = [CotizacionItemInline]
    # Los llenan los endpoints de aceptación y cancelación; no se editan a mano.
    readonly_fields = ["garantia_registrada_en", "garantia_registrada_por", "cancelado_en", "cancelado_por"]


admin.site.register(Cotizacion, CotizacionAdmin)
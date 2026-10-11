from django.contrib import admin
from .models import Cotizacion, CotizacionItem


class CotizacionItemInline(admin.TabularInline):
    model = CotizacionItem
    extra = 1


class CotizacionAdmin(admin.ModelAdmin):
    inlines = [CotizacionItemInline]
    # Los llena el endpoint de aceptación; no se editan a mano.
    readonly_fields = ["garantia_registrada_en", "garantia_registrada_por"]


admin.site.register(Cotizacion, CotizacionAdmin)
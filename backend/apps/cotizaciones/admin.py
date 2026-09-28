from django.contrib import admin
from .models import Cotizacion, CotizacionItem


class CotizacionItemInline(admin.TabularInline):
    model = CotizacionItem
    extra = 1


class CotizacionAdmin(admin.ModelAdmin):
    inlines = [CotizacionItemInline]


admin.site.register(Cotizacion, CotizacionAdmin)
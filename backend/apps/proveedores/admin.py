from django.contrib import admin
from .models import HistorialStockElemento, Proveedor, StockElemento

admin.site.register(Proveedor)
admin.site.register(StockElemento)
admin.site.register(HistorialStockElemento)

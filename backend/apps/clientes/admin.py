from django.contrib import admin
from .models import Empresa, Cliente

admin.site.register(Empresa)


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ["nombre", "tipo", "identificacion", "empresa", "activo"]
    list_filter = ["tipo", "activo"]
    search_fields = ["nombre", "identificacion", "correo", "empresa__razon_social"]

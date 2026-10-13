from django.contrib import admin
from .models import Empresa, Cliente

admin.site.register(Empresa)


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    # El formulario del admin llama a Cliente.clean() (full_clean): un jurídico con
    # identificación muestra el error bajo el campo (SGDE-91).
    list_display = ["nombre", "tipo", "identificacion", "empresa", "activo"]
    list_filter = ["tipo", "activo"]
    search_fields = ["nombre", "identificacion", "correo", "empresa__razon_social"]

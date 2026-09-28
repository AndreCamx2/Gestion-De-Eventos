from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Rol, Usuario


class UsuarioAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Información SGDE", {"fields": ("rol", "sitios")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Información SGDE", {"fields": ("rol", "sitios")}),
    )
    list_display = ("username", "email", "rol", "is_staff")
    filter_horizontal = ("sitios", "groups", "user_permissions")


admin.site.register(Rol)
admin.site.register(Usuario, UsuarioAdmin)
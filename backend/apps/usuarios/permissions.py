from rest_framework.permissions import BasePermission


class EsAdministrador(BasePermission):
    """
    Permite el acceso solo a usuarios autenticados con rol "administrador".

    Verifica el rol, no el sitio. El filtro por sitio lo hace cada vista con
    apps/sitios/acceso.py (SGDE-90).
    """

    message = "Solo los administradores pueden realizar esta acción."

    def has_permission(self, request, view):
        usuario = request.user
        return bool(
            usuario
            and usuario.is_authenticated
            and usuario.rol.codigo == "administrador"
        )

from rest_framework.permissions import BasePermission


class EsAdministrador(BasePermission):
    """
    Permite el acceso solo a usuarios autenticados con rol "administrador".

    Verifica el rol, no el sitio: filtrar por request.user.sitios (multi-tenant)
    queda pendiente, ver SEG-005 en la bóveda.
    """

    message = "Solo los administradores pueden realizar esta acción."

    def has_permission(self, request, view):
        usuario = request.user
        return bool(
            usuario
            and usuario.is_authenticated
            and usuario.rol.codigo == "administrador"
        )

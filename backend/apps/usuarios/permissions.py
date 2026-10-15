from rest_framework.exceptions import PermissionDenied
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


# Códigos del 403 de EsProveedor: la pantalla decide por el código, no por el texto.
CODIGO_NO_ES_PROVEEDOR = "no_es_proveedor"
CODIGO_PROVEEDOR_SIN_VINCULAR = "proveedor_sin_vincular"


class EsProveedor(BasePermission):
    """
    Permite el acceso solo a usuarios con rol "proveedor" que tienen un Proveedor
    vinculado (Proveedor.usuario, SGDE-30). Lo usa "Mi stock".

    El 403 responde {"detail": "...", "codigo": "..."} para que el frontend sepa si
    el usuario no es proveedor o si todavía no lo han vinculado. Va después de
    IsAuthenticated en permission_classes: sin token, ese da el 401 primero.
    """

    def has_permission(self, request, view):
        usuario = request.user
        if not (usuario and usuario.is_authenticated):
            return False
        if usuario.rol.codigo != "proveedor":
            raise PermissionDenied({
                "detail": "Solo los proveedores pueden realizar esta acción.",
                "codigo": CODIGO_NO_ES_PROVEEDOR,
            })
        if getattr(usuario, "proveedor", None) is None:
            raise PermissionDenied({
                "detail": "Tu usuario todavía no está vinculado a un proveedor. "
                          "Pídele al administrador que lo vincule.",
                "codigo": CODIGO_PROVEEDOR_SIN_VINCULAR,
            })
        return True

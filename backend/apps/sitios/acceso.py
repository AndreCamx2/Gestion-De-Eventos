"""Acceso por sitio (multi-sitio, SGDE-90).

Regla única para todo el API:
- Un superusuario (is_superuser) ve y usa todos los sitios.
- Cualquier otro usuario solo ve y usa los sitios de `usuario.sitios`.
  Sin sitios asignados no ve nada: listas vacías, detalles 404 y crear da 400.

Las vistas filtran sus querysets con `filtrar_por_sitio` (un id de otro sitio
da 404, no 403, para no revelar que existe) y los serializers usan
`CampoDeSitio` para que un sitio, salón o concepto ajeno dé 400.
"""
from rest_framework import serializers

from .models import Sitio


def sitios_del_usuario(usuario):
    """QuerySet con los sitios que el usuario puede ver y usar."""
    if usuario.is_superuser:
        return Sitio.objects.all()
    return usuario.sitios.all()


def filtrar_por_sitio(queryset, usuario, campo="sitio"):
    """Deja solo las filas cuyo `campo` apunta a un sitio del usuario.

    `campo` es el camino hasta el sitio: "sitio" (Salon, Concepto, Cotizacion),
    "salon__sitio" (SalonMontaje), "concepto__sitio" (historial de precios)
    o "id" (el propio Sitio).
    """
    if usuario.is_superuser:
        return queryset
    return queryset.filter(**{f"{campo}__in": usuario.sitios.all()})


class CampoDeSitio(serializers.PrimaryKeyRelatedField):
    """Relación que solo acepta objetos de los sitios del usuario que hace la petición.

    Un id de otro sitio da 400 con el mensaje normal de DRF ("objeto no existe"),
    igual que un id inexistente: no revela que exista en otro sitio.
    El usuario se lee del contexto al validar, así que también funciona dentro de
    serializers anidados (los items de una cotización). Sin `request` en el
    contexto no acepta nada.

        salon = CampoDeSitio(queryset=Salon.objects.all(), campo_sitio="sitio")
    """

    def __init__(self, campo_sitio="sitio", **kwargs):
        self.campo_sitio = campo_sitio
        super().__init__(**kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return queryset.none()
        return filtrar_por_sitio(queryset, request.user, self.campo_sitio)

"""Acceso por sitio.

Un superusuario ve todos los sitios; cualquier otro usuario, solo los de
`usuario.sitios`. Un id de otro sitio da 404 en las vistas y 400 en los serializers,
igual que uno inexistente, para no revelar que existe.
"""
from rest_framework import serializers

from .models import Sitio


def sitios_del_usuario(usuario):
    if usuario.is_superuser:
        return Sitio.objects.all()
    return usuario.sitios.all()


def filtrar_por_sitio(queryset, usuario, campo="sitio"):
    """`campo` es el camino hasta el sitio: "sitio", "salon__sitio", "concepto__sitio" o "id"."""
    if usuario.is_superuser:
        return queryset
    return queryset.filter(**{f"{campo}__in": usuario.sitios.all()})


class CampoDeSitio(serializers.PrimaryKeyRelatedField):
    """Relación que solo acepta objetos de los sitios del usuario de la petición.

    También funciona en serializers anidados. Sin `request` en el contexto no acepta nada.
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

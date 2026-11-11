from rest_framework import serializers

from apps.core.validadores import validar_nombre_cosa
from .models import Ciudad, Sitio


class CiudadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ciudad
        fields = ["id", "codigo", "nombre"]


class SitioSerializer(serializers.ModelSerializer):
    ciudad_nombre = serializers.CharField(source="ciudad.nombre", read_only=True)

    class Meta:
        model = Sitio
        fields = ["id", "nombre", "ciudad", "ciudad_nombre", "creado_en"]
        read_only_fields = ["creado_en"]

    def validate_nombre(self, value):
        return validar_nombre_cosa(value)

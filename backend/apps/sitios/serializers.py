from rest_framework import serializers
from .models import Sitio


class SitioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sitio
        fields = ["id", "nombre", "ciudad", "creado_en"]
        read_only_fields = ["creado_en"]

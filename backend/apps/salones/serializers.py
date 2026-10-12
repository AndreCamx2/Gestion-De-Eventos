from rest_framework import serializers
from apps.sitios.acceso import CampoDeSitio
from apps.sitios.models import Sitio
from .models import Salon, Montaje, SalonMontaje


class SalonSerializer(serializers.ModelSerializer):
    # Solo se puede crear en un sitio propio: uno ajeno da 400 (SGDE-90).
    sitio = CampoDeSitio(queryset=Sitio.objects.all(), campo_sitio="id")

    class Meta:
        model = Salon
        fields = ["id", "sitio", "nombre", "altura", "ancho", "foto_url"]


class MontajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Montaje
        fields = ["id", "codigo", "nombre", "descripcion"]


class SalonMontajeSerializer(serializers.ModelSerializer):
    # El salón debe ser de un sitio propio; el montaje es un catálogo compartido.
    salon = CampoDeSitio(queryset=Salon.objects.all(), campo_sitio="sitio")

    class Meta:
        model = SalonMontaje
        fields = ["id", "salon", "montaje", "aforo", "foto_url"]

from rest_framework import serializers
from .models import Salon, Montaje, SalonMontaje


class SalonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salon
        fields = ["id", "sitio", "nombre", "altura", "ancho", "foto_url"]


class MontajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Montaje
        fields = ["id", "codigo", "nombre", "descripcion"]


class SalonMontajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalonMontaje
        fields = ["id", "salon", "montaje", "aforo", "foto_url"]
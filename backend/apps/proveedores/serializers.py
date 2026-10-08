from rest_framework import serializers
from .models import Proveedor, StockElemento


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ["id", "nombre", "identificacion", "contacto"]


class StockElementoSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockElemento
        fields = ["id", "proveedor", "nombre_elemento", "cantidad", "valor", "actualizado_en"]
        read_only_fields = ["actualizado_en"]
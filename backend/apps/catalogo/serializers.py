from rest_framework import serializers
from .models import Concepto, HistorialPrecioConcepto


class ConceptoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Concepto
        fields = ["id", "sitio", "nombre", "precio", "impuesto_pct", "activo"]

    def validate_precio(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio no puede ser negativo.")
        return value


class HistorialPrecioConceptoSerializer(serializers.ModelSerializer):
    modificado_por = serializers.CharField(source="modificado_por.username", read_only=True)

    class Meta:
        model = HistorialPrecioConcepto
        fields = ["id", "concepto", "precio_anterior", "precio_nuevo", "modificado_por", "fecha_modificacion"]
        read_only_fields = fields
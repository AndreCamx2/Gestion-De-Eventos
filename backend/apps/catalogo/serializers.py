from rest_framework import serializers
from .models import Concepto


class ConceptoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Concepto
        fields = ["id", "sitio", "nombre", "precio", "impuesto_pct", "activo"]


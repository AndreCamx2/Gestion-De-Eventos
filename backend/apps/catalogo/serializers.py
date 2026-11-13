from rest_framework import serializers
from apps.sitios.acceso import CampoDeSitio
from apps.sitios.models import Sitio
from .models import Concepto, HistorialPrecioConcepto


class ConceptoSerializer(serializers.ModelSerializer):
    # Al crear o editar, solo un sitio propio: uno ajeno da 400 (SGDE-90).
    sitio = CampoDeSitio(queryset=Sitio.objects.all(), campo_sitio="id")

    class Meta:
        model = Concepto
        fields = ["id", "sitio", "nombre", "precio", "impuesto_pct", "activo"]

    def validate_precio(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio no puede ser negativo.")
        return value

    def validate_impuesto_pct(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("El impuesto debe estar entre 0 y 100 %.")
        return value

    def validate(self, attrs):
        sitio = attrs.get("sitio", getattr(self.instance, "sitio", None))
        nombre = attrs.get("nombre")
        if sitio is not None and nombre:
            repetido = Concepto.objects.filter(sitio=sitio, nombre__iexact=nombre)
            if self.instance is not None:
                repetido = repetido.exclude(pk=self.instance.pk)
            if repetido.exists():
                raise serializers.ValidationError({"nombre": ["Ya hay un concepto con este nombre en el venue."]})
        return attrs


class HistorialPrecioConceptoSerializer(serializers.ModelSerializer):
    modificado_por = serializers.CharField(source="modificado_por.username", read_only=True)

    class Meta:
        model = HistorialPrecioConcepto
        fields = ["id", "concepto", "precio_anterior", "precio_nuevo", "modificado_por", "fecha_modificacion"]
        read_only_fields = fields
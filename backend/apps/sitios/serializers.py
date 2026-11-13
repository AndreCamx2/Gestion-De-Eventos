from rest_framework import serializers
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

    def validate(self, attrs):
        ciudad = attrs.get("ciudad", getattr(self.instance, "ciudad", None))
        nombre = attrs.get("nombre")
        if ciudad is not None and nombre:
            repetido = Sitio.objects.filter(ciudad=ciudad, nombre__iexact=nombre)
            if self.instance is not None:
                repetido = repetido.exclude(pk=self.instance.pk)
            if repetido.exists():
                raise serializers.ValidationError({"nombre": ["Ya hay un venue con este nombre en la ciudad."]})
        return attrs

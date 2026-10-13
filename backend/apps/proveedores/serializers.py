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
        # Un valor negativo no tiene sentido (SGDE-98); la cantidad ya es PositiveIntegerField.
        extra_kwargs = {"valor": {"min_value": 0}}

    def validate(self, attrs):
        # Al editar solo cambian cantidad y valor (SGDE-98): otro elemento o proveedor
        # es otro registro, no una edición.
        if self.instance is not None:
            errores = {
                campo: ["No se puede cambiar: crea un elemento nuevo."]
                for campo in ("proveedor", "nombre_elemento")
                if campo in attrs and attrs[campo] != getattr(self.instance, campo)
            }
            if errores:
                raise serializers.ValidationError(errores)
        return attrs

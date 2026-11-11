from rest_framework import serializers

from apps.core.validadores import validar_contacto, validar_identificacion_proveedor, validar_nombre_cosa
from .models import HistorialStockElemento, Proveedor, StockElemento


class ProveedorSerializer(serializers.ModelSerializer):
    """El administrador vincula (o desvincula con null) el usuario de acceso del
    proveedor (SGDE-30). Solo un usuario con rol "proveedor" y uno por proveedor."""

    # SerializerMethodField y no CharField(default=None): en un PATCH parcial DRF
    # omite los campos que caen en su default y la respuesta llegaría sin la clave.
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Proveedor
        fields = ["id", "nombre", "identificacion", "contacto", "usuario", "usuario_nombre"]
        # El UniqueValidator automático no ignora null (varios proveedores sin
        # usuario chocarían entre sí): la unicidad la revisa validate_usuario.
        extra_kwargs = {"usuario": {"validators": []}}

    def validate_nombre(self, value):
        return validar_nombre_cosa(value)

    def validate_identificacion(self, value):
        return validar_identificacion_proveedor(value)

    def validate_contacto(self, value):
        return validar_contacto(value)

    def get_usuario_nombre(self, proveedor):
        return proveedor.usuario.username if proveedor.usuario else None

    def validate_usuario(self, usuario):
        if usuario is None:
            return usuario
        if usuario.rol.codigo != "proveedor":
            raise serializers.ValidationError("Solo se puede vincular un usuario con rol proveedor.")
        otros = Proveedor.objects.filter(usuario=usuario)
        if self.instance is not None:
            otros = otros.exclude(pk=self.instance.pk)
        if otros.exists():
            raise serializers.ValidationError("Este usuario ya está vinculado a otro proveedor.")
        return usuario


class StockElementoSerializer(serializers.ModelSerializer):
    mensaje_repetido = "Este proveedor ya tiene un elemento con ese nombre."

    class Meta:
        model = StockElemento
        fields = ["id", "proveedor", "nombre_elemento", "cantidad", "valor", "actualizado_en"]
        read_only_fields = ["actualizado_en"]
        # Un valor negativo no tiene sentido (SGDE-98); la cantidad ya es PositiveIntegerField.
        extra_kwargs = {"valor": {"min_value": 0}}

    def proveedor_del_elemento(self, attrs):
        return attrs["proveedor"]

    def validate_nombre_elemento(self, value):
        # Al editar el nombre no cambia (ver validate): uno viejo que no cumple se deja pasar.
        if self.instance is not None and value == self.instance.nombre_elemento:
            return value
        return validar_nombre_cosa(value)

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
        # DRF no revisa solo un UniqueConstraint con Lower(), y los espacios de los
        # extremos ya los quita CharField (SGDE-135).
        elif self.proveedor_del_elemento(attrs).stock.filter(
            nombre_elemento__iexact=attrs["nombre_elemento"]
        ).exists():
            raise serializers.ValidationError({"nombre_elemento": [self.mensaje_repetido]})
        return attrs


class MiStockSerializer(StockElementoSerializer):
    """Stock del proveedor que llama ("Mi stock", SGDE-30). El proveedor lo pone la
    vista (context["proveedor"]): si llega en el cuerpo, se ignora."""

    mensaje_repetido = "Ya tienes un elemento con este nombre: edítalo."

    class Meta(StockElementoSerializer.Meta):
        read_only_fields = ["proveedor", "actualizado_en"]

    def proveedor_del_elemento(self, attrs):
        return self.context["proveedor"]


class HistorialStockElementoSerializer(serializers.ModelSerializer):
    modificado_por = serializers.CharField(source="modificado_por.username", read_only=True)

    class Meta:
        model = HistorialStockElemento
        fields = [
            "id", "elemento", "cantidad_anterior", "cantidad_nueva", "valor_anterior", "valor_nuevo",
            "modificado_por", "fecha_modificacion",
        ]
        read_only_fields = fields

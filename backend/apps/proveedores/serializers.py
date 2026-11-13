from rest_framework import serializers
from apps.clientes.validadores import validar_documento, validar_razon_social
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
        return validar_razon_social(value)

    def validate_identificacion(self, value):
        return validar_documento(value)

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


CANTIDAD_MAXIMA = 1_000_000


def nombre_repetido(proveedor, nombre):
    return proveedor.stock.filter(nombre_elemento__iexact=nombre).exists()


class StockElementoSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockElemento
        fields = ["id", "proveedor", "nombre_elemento", "cantidad", "valor", "actualizado_en"]
        read_only_fields = ["actualizado_en"]
        # Un valor negativo no tiene sentido (SGDE-98); la cantidad ya es PositiveIntegerField.
        extra_kwargs = {
            "valor": {"min_value": 0},
            "cantidad": {
                "max_value": CANTIDAD_MAXIMA,
                "error_messages": {"max_value": "La cantidad no puede pasar de 1.000.000."},
            },
        }
        # (proveedor, nombre) se revisa sin distinguir mayúsculas en validate().
        validators = []

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
        proveedor = attrs.get("proveedor", getattr(self.instance, "proveedor", None))
        nombre = attrs.get("nombre_elemento")
        if self.instance is None and proveedor is not None and nombre and nombre_repetido(proveedor, nombre):
            raise serializers.ValidationError({"nombre_elemento": ["Este proveedor ya tiene un elemento con este nombre."]})
        return attrs


class MiStockSerializer(StockElementoSerializer):
    """Stock del proveedor que llama ("Mi stock", SGDE-30). El proveedor lo pone la
    vista (context["proveedor"]): si llega en el cuerpo, se ignora."""

    class Meta(StockElementoSerializer.Meta):
        read_only_fields = ["proveedor", "actualizado_en"]
        # Sin proveedor en el cuerpo, DRF no puede revisar la unicidad (proveedor,
        # nombre_elemento): la revisa validate_nombre_elemento.
        validators = []

    def validate_nombre_elemento(self, nombre):
        proveedor = self.context["proveedor"]
        if self.instance is None and nombre_repetido(proveedor, nombre):
            raise serializers.ValidationError("Ya tienes un elemento con este nombre: edítalo.")
        return nombre


class HistorialStockElementoSerializer(serializers.ModelSerializer):
    modificado_por = serializers.CharField(source="modificado_por.username", read_only=True)

    class Meta:
        model = HistorialStockElemento
        fields = [
            "id", "elemento", "cantidad_anterior", "cantidad_nueva", "valor_anterior", "valor_nuevo",
            "modificado_por", "fecha_modificacion",
        ]
        read_only_fields = fields

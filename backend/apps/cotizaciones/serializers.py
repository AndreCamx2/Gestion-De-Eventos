from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogo.models import Concepto
from apps.clientes.models import Cliente
from apps.salones.models import Montaje, Salon, SalonMontaje
from apps.sitios.models import Sitio

from .models import Cotizacion, CotizacionItem
from .services import totales_cotizacion, totales_linea

DIAS_VIGENCIA_POR_DEFECTO = 15


class CotizacionCalendarioSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    salon_nombre = serializers.CharField(source="salon.nombre", read_only=True)

    class Meta:
        model = Cotizacion
        fields = [
            "id", "salon", "salon_nombre", "cliente", "cliente_nombre",
            "estado", "fecha_evento", "cantidad_personas",
        ]


def validar_validez_oferta(validez, fecha_evento):
    """La vigencia va de hoy hasta el día del evento. Devuelve el mensaje de error o None."""
    if validez < timezone.localdate():
        return "La validez de la oferta no puede ser anterior a hoy."
    if validez > fecha_evento:
        return "La validez de la oferta no puede ser posterior a la fecha del evento."
    return None


# --- Entrada: crear cotización ---------------------------------------------

class CotizacionItemEntradaSerializer(serializers.Serializer):
    concepto = serializers.PrimaryKeyRelatedField(queryset=Concepto.objects.all())
    cantidad = serializers.IntegerField(min_value=1)


class CotizacionCrearSerializer(serializers.ModelSerializer):
    items = CotizacionItemEntradaSerializer(many=True)

    class Meta:
        model = Cotizacion
        fields = ["cliente", "salon", "montaje", "fecha_evento", "cantidad_personas", "validez_oferta", "items"]
        extra_kwargs = {"cantidad_personas": {"min_value": 1}}

    def validate_fecha_evento(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("La fecha del evento no puede ser pasada.")
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("La cotización debe tener al menos un concepto.")
        return value

    def validate(self, attrs):
        salon = attrs["salon"]
        errores = {}

        salon_montaje = SalonMontaje.objects.filter(salon=salon, montaje=attrs["montaje"]).first()
        if salon_montaje is None:
            errores["montaje"] = ["El montaje no está habilitado para este salón."]
        elif attrs["cantidad_personas"] > salon_montaje.aforo:
            errores["cantidad_personas"] = [f"Supera el aforo del montaje ({salon_montaje.aforo} personas)."]

        # Si no la envían: hoy + 15 días, sin pasarse del día del evento.
        if "validez_oferta" not in attrs or attrs["validez_oferta"] is None:
            por_defecto = timezone.localdate() + timedelta(days=DIAS_VIGENCIA_POR_DEFECTO)
            attrs["validez_oferta"] = min(por_defecto, attrs["fecha_evento"])
        else:
            error = validar_validez_oferta(attrs["validez_oferta"], attrs["fecha_evento"])
            if error:
                errores["validez_oferta"] = [error]

        # Errores por línea, en la misma posición que el request: [{}, {"concepto": [...]}]
        errores_items = []
        for item in attrs["items"]:
            concepto = item["concepto"]
            if not concepto.activo:
                errores_items.append({"concepto": ["El concepto está inactivo."]})
            elif concepto.sitio_id != salon.sitio_id:
                errores_items.append({"concepto": ["El concepto no pertenece al sitio del salón."]})
            else:
                errores_items.append({})
        if any(errores_items):
            errores["items"] = errores_items

        if errores:
            raise serializers.ValidationError(errores)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop("items")
        salon = validated_data["salon"]
        cotizacion = Cotizacion.objects.create(
            sitio=salon.sitio, usuario=self.context["request"].user, **validated_data
        )
        CotizacionItem.objects.bulk_create([
            CotizacionItem(
                cotizacion=cotizacion,
                concepto=item["concepto"],
                cantidad=item["cantidad"],
                precio_unitario=item["concepto"].precio,
                impuesto_pct=item["concepto"].impuesto_pct,
            )
            for item in items
        ])
        return cotizacion


# --- Salida: detalle y listado ---------------------------------------------

class SitioResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sitio
        fields = ["id", "nombre"]


class ClienteResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ["id", "nombre", "identificacion", "correo"]


class SalonResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salon
        fields = ["id", "nombre"]


class MontajeResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Montaje
        fields = ["id", "nombre"]


class CotizacionItemDetalleSerializer(serializers.ModelSerializer):
    concepto_nombre = serializers.CharField(source="concepto.nombre", read_only=True)

    class Meta:
        model = CotizacionItem
        fields = ["id", "concepto", "concepto_nombre", "cantidad", "precio_unitario", "impuesto_pct"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        totales = totales_linea(instance.cantidad, instance.precio_unitario, instance.impuesto_pct)
        # Como string, igual que los DecimalField de DRF.
        data.update({clave: str(valor) for clave, valor in totales.items()})
        return data


def _totales(cotizacion):
    """Calcula los totales una sola vez por cotización, aunque se pidan varios campos."""
    if not hasattr(cotizacion, "_totales"):
        cotizacion._totales = totales_cotizacion(cotizacion.items.all())
    return cotizacion._totales


class CotizacionDetalleSerializer(serializers.ModelSerializer):
    vencida = serializers.BooleanField(read_only=True)
    sitio = SitioResumenSerializer(read_only=True)
    cliente = ClienteResumenSerializer(read_only=True)
    salon = SalonResumenSerializer(read_only=True)
    montaje = MontajeResumenSerializer(read_only=True)
    aforo = serializers.SerializerMethodField()
    creado_por = serializers.CharField(source="usuario.username", read_only=True)
    items = CotizacionItemDetalleSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    impuestos = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = [
            "id", "estado", "vencida", "sitio", "cliente", "salon", "montaje", "aforo",
            "fecha_evento", "cantidad_personas", "validez_oferta", "creado_en", "creado_por",
            "items", "subtotal", "impuestos", "total",
        ]
        read_only_fields = fields

    def get_aforo(self, obj):
        return (
            SalonMontaje.objects.filter(salon_id=obj.salon_id, montaje_id=obj.montaje_id)
            .values_list("aforo", flat=True)
            .first()
        )

    def get_subtotal(self, obj):
        return str(_totales(obj)["subtotal"])

    def get_impuestos(self, obj):
        return str(_totales(obj)["impuestos"])

    def get_total(self, obj):
        return str(_totales(obj)["total"])


class CotizacionListaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    salon_nombre = serializers.CharField(source="salon.nombre", read_only=True)
    vencida = serializers.BooleanField(read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = [
            "id", "estado", "vencida", "cliente_nombre", "salon_nombre",
            "fecha_evento", "cantidad_personas", "validez_oferta", "total",
        ]
        read_only_fields = fields

    def get_total(self, obj):
        return str(_totales(obj)["total"])


# --- Entrada: cambiar la vigencia (SGDE-19) ----------------------------------

class CotizacionVigenciaSerializer(serializers.ModelSerializer):
    """Solo cambia validez_oferta; cualquier otro campo enviado es un error 400."""

    class Meta:
        model = Cotizacion
        fields = ["validez_oferta"]
        extra_kwargs = {"validez_oferta": {"required": True, "allow_null": False}}

    def validate(self, attrs):
        no_permitidos = set(self.initial_data) - set(self.fields)
        if no_permitidos:
            raise serializers.ValidationError(
                {campo: ["Este campo no se puede modificar."] for campo in sorted(no_permitidos)}
            )
        error = validar_validez_oferta(attrs["validez_oferta"], self.instance.fecha_evento)
        if error:
            raise serializers.ValidationError({"validez_oferta": [error]})
        return attrs

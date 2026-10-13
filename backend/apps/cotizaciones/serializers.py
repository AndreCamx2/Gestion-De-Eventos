from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogo.models import Concepto
from apps.clientes.models import Cliente
from apps.salones.models import Montaje, Salon, SalonMontaje
from apps.sitios.acceso import CampoDeSitio
from apps.sitios.models import Sitio

from .estados import fecha_corta, registrar
from .models import Cotizacion, CotizacionItem, MovimientoCotizacion
from .services import redondear, totales_cotizacion, totales_linea

DIAS_VIGENCIA_POR_DEFECTO = 15


class CotizacionCalendarioSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    salon_nombre = serializers.CharField(source="salon.nombre", read_only=True)
    montaje_nombre = serializers.CharField(source="montaje.nombre", read_only=True)
    vencida = serializers.BooleanField(read_only=True)

    class Meta:
        model = Cotizacion
        fields = [
            "id", "salon", "salon_nombre", "cliente", "cliente_nombre",
            "montaje", "montaje_nombre", "estado", "vencida", "fecha_evento",
            "cantidad_personas", "validez_oferta",
        ]


def validar_validez_oferta(validez, fecha_evento):
    """La vigencia va de hoy hasta el día del evento. Devuelve el mensaje de error o None."""
    if validez < timezone.localdate():
        return "La validez de la oferta no puede ser anterior a hoy."
    if validez > fecha_evento:
        return "La validez de la oferta no puede ser posterior a la fecha del evento."
    return None


# --- Entrada: crear cotización ---------------------------------------------

class ItemsEntradaListSerializer(serializers.ListSerializer):
    """Errores de `items` siempre como lista, una posición por item ({} si está bien).

    DRF devuelve los errores de campo de una lista anidada como {posición: error},
    solo con los items que fallan; las reglas de CotizacionCrearSerializer.validate()
    los devuelven como lista. Aquí se pasa todo a lista para que el frontend lea un
    solo formato: [{}, {"concepto": [...]}, {"cantidad": [...]}].
    Los errores de la lista entera ("no es una lista", "vacía") no cambian.
    """

    def to_internal_value(self, data):
        try:
            return super().to_internal_value(data)
        except serializers.ValidationError as exc:
            detalle = exc.detail
            if isinstance(data, list) and isinstance(detalle, dict) and all(isinstance(k, int) for k in detalle):
                raise serializers.ValidationError([detalle.get(i, {}) for i in range(len(data))])
            raise


class CotizacionItemEntradaSerializer(serializers.Serializer):
    # Solo conceptos de los sitios del usuario: uno de un sitio ajeno da 400 (SGDE-90).
    concepto = CampoDeSitio(queryset=Concepto.objects.all())
    cantidad = serializers.IntegerField(min_value=1)

    class Meta:
        list_serializer_class = ItemsEntradaListSerializer


class CotizacionCrearSerializer(serializers.ModelSerializer):
    # El salón define el sitio de la cotización: solo uno de los sitios del usuario.
    salon = CampoDeSitio(queryset=Salon.objects.all())
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

        # SGDE-100: se bloquean el salón y su montaje habilitado hasta guardar la cotización,
        # para que nadie quite el montaje (ni baje el aforo) entre esta revisión y el guardado.
        # Mismo orden que el resto del API: primero el Salón. Requiere transaction.atomic():
        # la vista de creación corre is_valid() y save() dentro de una.
        if not Salon.objects.select_for_update().get(pk=salon.pk).activo:
            # Leído de la fila bloqueada: una baja simultánea no se cuela (SGDE-99).
            raise serializers.ValidationError({"salon": ["El salón está dado de baja."]})
        salon_montaje = (
            SalonMontaje.objects.select_for_update().filter(salon=salon, montaje=attrs["montaje"]).first()
        )
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
        registrar(
            cotizacion, "creada", cotizacion.usuario,
            f"Evento el {fecha_corta(cotizacion.fecha_evento)} para {cotizacion.cantidad_personas} personas.",
        )
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


def garantia_de(cotizacion):
    """La garantía como la muestran el detalle y el listado: null hasta la aceptación (SGDE-20)."""
    if not cotizacion.garantia_tipo:
        return None
    return {
        "tipo": cotizacion.garantia_tipo,
        "monto": str(redondear(cotizacion.garantia_monto)) if cotizacion.garantia_monto is not None else None,
        "registrada_en": serializers.DateTimeField().to_representation(cotizacion.garantia_registrada_en)
        if cotizacion.garantia_registrada_en else None,
        "registrada_por": cotizacion.garantia_registrada_por.username
        if cotizacion.garantia_registrada_por else None,
    }


CAMPOS_CANCELACION = ["cancelado_en", "cancelado_por", "penalizacion_pct", "motivo_cancelacion", "monto_retenido"]


class CancelacionSalidaMixin(serializers.Serializer):
    """Campos de la cancelación (SGDE-61), iguales en el detalle y el listado.

    monto_retenido = total × penalizacion_pct ÷ 100, redondeado como los totales;
    null si la cotización no está cancelada.
    """

    cancelado_en = serializers.DateTimeField(read_only=True)
    cancelado_por = serializers.SerializerMethodField()
    monto_retenido = serializers.SerializerMethodField()

    def get_cancelado_por(self, obj):
        return obj.cancelado_por.username if obj.cancelado_por else None

    def get_monto_retenido(self, obj):
        if obj.estado != "cancelado" or obj.penalizacion_pct is None:
            return None
        return str(redondear(_totales(obj)["total"] * obj.penalizacion_pct / 100))


class CotizacionDetalleSerializer(CancelacionSalidaMixin, serializers.ModelSerializer):
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
    garantia = serializers.SerializerMethodField()
    # Solo la aceptación (SGDE-20) confirma, y en el mismo save registra la garantía:
    # esa fecha es la de confirmación. Lo confirmado a mano en /admin/ queda en null.
    confirmado_en = serializers.DateTimeField(source="garantia_registrada_en", read_only=True)

    class Meta:
        model = Cotizacion
        fields = [
            "id", "estado", "vencida", "sitio", "cliente", "salon", "montaje", "aforo",
            "fecha_evento", "cantidad_personas", "validez_oferta", "bloqueo_hasta", "creado_en",
            "creado_por", "confirmado_en", "items", "subtotal", "impuestos", "total", "garantia",
            *CAMPOS_CANCELACION,
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

    def get_garantia(self, obj):
        return garantia_de(obj)


class CotizacionListaSerializer(CancelacionSalidaMixin, serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    salon_nombre = serializers.CharField(source="salon.nombre", read_only=True)
    montaje_nombre = serializers.CharField(source="montaje.nombre", read_only=True)
    vencida = serializers.BooleanField(read_only=True)
    total = serializers.SerializerMethodField()
    garantia = serializers.SerializerMethodField()
    # Misma regla que en el detalle: la fecha de la aceptación es la de confirmación.
    confirmado_en = serializers.DateTimeField(source="garantia_registrada_en", read_only=True)

    class Meta:
        model = Cotizacion
        fields = [
            "id", "estado", "vencida", "cliente_nombre", "salon_nombre", "montaje_nombre",
            "fecha_evento", "cantidad_personas", "validez_oferta", "bloqueo_hasta",
            "creado_en", "confirmado_en", "total", "garantia", *CAMPOS_CANCELACION,
        ]
        read_only_fields = fields

    def get_total(self, obj):
        return str(_totales(obj)["total"])

    def get_garantia(self, obj):
        return garantia_de(obj)


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


# --- Entrada: aceptación y garantía (SGDE-20) --------------------------------

class AceptacionSerializer(serializers.Serializer):
    TIPO_CHOICES = ["transferencia", "tarjeta", "consignacion", "efectivo"]

    tipo = serializers.ChoiceField(choices=TIPO_CHOICES)
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_monto(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto debe ser mayor que 0.")
        return value


# --- Entrada: bloqueo (SGDE-40/60/15) ---------------------------------------

class BloqueoSerializer(serializers.Serializer):
    # Con hora: "2026-10-14T18:00:00-05:00". Sin zona, se toma la de Colombia (TIME_ZONE).
    bloqueo_hasta = serializers.DateTimeField()


# --- Entrada: cancelación (SGDE-61) -----------------------------------------

class CancelacionSerializer(serializers.Serializer):
    penalizacion_pct = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal("0"), max_value=Decimal("100"),
        error_messages={
            "min_value": "La penalización debe estar entre 0 y 100.",
            "max_value": "La penalización debe estar entre 0 y 100.",
        },
    )
    motivo = serializers.CharField(
        error_messages={"blank": "Escribe el motivo de la cancelación.", "required": "Escribe el motivo de la cancelación."},
    )


# --- Salida: movimientos (SGDE-62) ------------------------------------------

class MovimientoSerializer(serializers.ModelSerializer):
    # El username de quien lo hizo, o "sistema" (usuario null).
    usuario = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoCotizacion
        fields = ["id", "tipo", "usuario", "fecha", "detalle"]

    def get_usuario(self, obj):
        return obj.usuario.username if obj.usuario else "sistema"

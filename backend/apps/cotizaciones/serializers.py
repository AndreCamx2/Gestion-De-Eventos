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
from .models import Cotizacion, CotizacionItem, GrupoEvento, MovimientoCotizacion, TipoEvento
from .services import garantia_minima, redondear, totales_cotizacion, totales_linea

DIAS_VIGENCIA_POR_DEFECTO = 15
ANIOS_MAXIMOS_DE_ANTICIPACION = 5
CANTIDAD_MAXIMA_POR_CONCEPTO = 100_000
CONCEPTOS_MAXIMOS = 100
LARGO_MAXIMO_MOTIVO = 1000

class EstadoEfectivoMixin:
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.bloqueo_vencido:
            data["estado"] = "cotizado"
            if "bloqueo_hasta" in data:
                data["bloqueo_hasta"] = None
        return data


class CotizacionCalendarioSerializer(EstadoEfectivoMixin, serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    salon_nombre = serializers.CharField(source="salon.nombre", read_only=True)
    montaje_nombre = serializers.CharField(source="montaje.nombre", read_only=True)
    vencida = serializers.BooleanField(read_only=True)

    class Meta:
        model = Cotizacion
        fields = [
            "id", "salon", "salon_nombre", "cliente", "cliente_nombre",
            "montaje", "montaje_nombre", "estado", "vencida", "fecha_evento",
            "cantidad_personas", "validez_oferta", "bloqueo_hasta",
        ]


def validar_validez_oferta(validez, fecha_evento):
    if validez < timezone.localdate():
        return "La validez de la oferta no puede ser anterior a hoy."
    if validez > fecha_evento:
        return "La validez de la oferta no puede ser posterior a la fecha del evento."
    return None

def validar_tipo_evento_activo(tipo):
    if not tipo.activo or not tipo.grupo.activo:
        raise serializers.ValidationError("El tipo de evento está inactivo.")
    return tipo


class ItemsEntradaListSerializer(serializers.ListSerializer):
    """Errores de items siempre como lista, una posición por item: DRF los da como
    {posición: error} y validate() como lista, y el frontend lee un solo formato.
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
    concepto = CampoDeSitio(queryset=Concepto.objects.all())
    cantidad = serializers.IntegerField(
        min_value=1, max_value=CANTIDAD_MAXIMA_POR_CONCEPTO,
        error_messages={"max_value": "La cantidad no puede pasar de 100.000."},
    )

    class Meta:
        list_serializer_class = ItemsEntradaListSerializer


class CotizacionCrearSerializer(serializers.ModelSerializer):
    salon = CampoDeSitio(queryset=Salon.objects.all())
    items = CotizacionItemEntradaSerializer(
        many=True, max_length=CONCEPTOS_MAXIMOS,
        error_messages={"max_length": f"Una cotización admite máximo {CONCEPTOS_MAXIMOS} conceptos."},
    )
    tipo_evento = serializers.PrimaryKeyRelatedField(queryset=TipoEvento.objects.select_related("grupo"))

    class Meta:
        model = Cotizacion
        fields = ["cliente", "salon", "montaje", "tipo_evento", "fecha_evento", "cantidad_personas", "validez_oferta", "items"]
        extra_kwargs = {"cantidad_personas": {"min_value": 1}}

    def validate_fecha_evento(self, value):
        hoy = timezone.localdate()
        if value < hoy:
            raise serializers.ValidationError("La fecha del evento no puede ser pasada.")
        if value > hoy + timedelta(days=365 * ANIOS_MAXIMOS_DE_ANTICIPACION):
            raise serializers.ValidationError(
                f"La fecha del evento no puede ser a más de {ANIOS_MAXIMOS_DE_ANTICIPACION} años."
            )
        return value

    def validate_cliente(self, value):
        if not value.activo:
            raise serializers.ValidationError("El cliente está dado de baja.")
        return value

    def validate_tipo_evento(self, value):
        return validar_tipo_evento_activo(value)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("La cotización debe tener al menos un concepto.")
        return value

    def validate(self, attrs):
        salon = attrs["salon"]
        errores = {}

        # Salón y montaje quedan bloqueados hasta guardar, para que nadie quite el montaje
        # ni baje el aforo en medio. Primero el Salón, como en el resto del API.
        if not Salon.objects.select_for_update().get(pk=salon.pk).activo:
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

        errores_items = []
        vistos = set()
        for item in attrs["items"]:
            concepto = item["concepto"]
            repetido = concepto.pk in vistos
            vistos.add(concepto.pk)
            if repetido:
                errores_items.append({"concepto": ["Este concepto ya está en la cotización: suma la cantidad."]})
            elif not concepto.activo:
                errores_items.append({"concepto": ["El concepto está inactivo."]})
            elif concepto.sitio_id != salon.sitio_id:
                errores_items.append({"concepto": ["El concepto no pertenece al venue del salón."]})
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

    @transaction.atomic
    def update(self, instance, validated_data):
        """Los conceptos que ya estaban conservan su precio e impuesto; los nuevos toman el actual."""
        items = validated_data.pop("items")
        cambios = _cambios_de_edicion(instance, validated_data, items)
        previos = {item.concepto_id: item for item in instance.items.all()}

        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        instance.sitio = instance.salon.sitio
        instance.save()

        instance.items.all().delete()
        nuevos = []
        for item in items:
            concepto = item["concepto"]
            previo = previos.get(concepto.pk)
            nuevos.append(CotizacionItem(
                cotizacion=instance,
                concepto=concepto,
                cantidad=item["cantidad"],
                precio_unitario=previo.precio_unitario if previo else concepto.precio,
                impuesto_pct=previo.impuesto_pct if previo else concepto.impuesto_pct,
            ))
        CotizacionItem.objects.bulk_create(nuevos)
        registrar(instance, "editada", self.context["request"].user, cambios or "Sin cambios.")
        return instance


def _cambios_de_edicion(cotizacion, datos, items):
    cambios = []
    if datos["cliente"].pk != cotizacion.cliente_id:
        cambios.append(f"cliente: {datos['cliente'].nombre}")
    if datos["salon"].pk != cotizacion.salon_id or datos["montaje"].pk != cotizacion.montaje_id:
        cambios.append(f"salón: {datos['salon'].nombre} · {datos['montaje'].nombre}")
    if datos["fecha_evento"] != cotizacion.fecha_evento:
        cambios.append(f"fecha: {fecha_corta(cotizacion.fecha_evento)} → {fecha_corta(datos['fecha_evento'])}")
    if datos["cantidad_personas"] != cotizacion.cantidad_personas:
        cambios.append(f"personas: {cotizacion.cantidad_personas} → {datos['cantidad_personas']}")
    if datos["validez_oferta"] != cotizacion.validez_oferta:
        cambios.append(f"vigencia: {fecha_corta(cotizacion.validez_oferta)} → {fecha_corta(datos['validez_oferta'])}")
    antes = sorted((i.concepto_id, i.cantidad) for i in cotizacion.items.all())
    despues = sorted((i["concepto"].pk, i["cantidad"]) for i in items)
    if antes != despues:
        cambios.append(f"conceptos: {len(despues)}")
    if not cambios:
        return ""
    texto = "; ".join(cambios)
    return f"{texto[0].upper()}{texto[1:]}."


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

class GrupoEventoResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrupoEvento
        fields = ["id", "nombre"]


class TipoEventoResumenSerializer(serializers.ModelSerializer):
    grupo = GrupoEventoResumenSerializer(read_only=True)

    class Meta:
        model = TipoEvento
        fields = ["id", "nombre", "grupo"]


class TipoEventoSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEvento
        fields = ["id", "nombre"]


class GrupoEventoConTiposSerializer(serializers.ModelSerializer):
    tipos = TipoEventoSimpleSerializer(many=True, read_only=True)

    class Meta:
        model = GrupoEvento
        fields = ["id", "nombre", "orden", "tipos"]

class CotizacionItemDetalleSerializer(serializers.ModelSerializer):
    concepto_nombre = serializers.CharField(source="concepto.nombre", read_only=True)

    class Meta:
        model = CotizacionItem
        fields = ["id", "concepto", "concepto_nombre", "cantidad", "precio_unitario", "impuesto_pct"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        totales = totales_linea(instance.cantidad, instance.precio_unitario, instance.impuesto_pct)
        data.update({clave: str(valor) for clave, valor in totales.items()})
        return data


def _totales(cotizacion):
    if not hasattr(cotizacion, "_totales"):
        cotizacion._totales = totales_cotizacion(cotizacion.items.all())
    return cotizacion._totales


def garantia_de(cotizacion):
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
    cancelado_en = serializers.DateTimeField(read_only=True)
    cancelado_por = serializers.SerializerMethodField()
    monto_retenido = serializers.SerializerMethodField()

    def get_cancelado_por(self, obj):
        return obj.cancelado_por.username if obj.cancelado_por else None

    def get_monto_retenido(self, obj):
        if obj.estado != "cancelado" or obj.penalizacion_pct is None:
            return None
        return str(redondear(_totales(obj)["total"] * obj.penalizacion_pct / 100))


class CotizacionDetalleSerializer(EstadoEfectivoMixin, CancelacionSalidaMixin, serializers.ModelSerializer):
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
    garantia_minima = serializers.SerializerMethodField()
    # La aceptación confirma y registra la garantía en el mismo save: es la fecha de confirmación.
    confirmado_en = serializers.DateTimeField(source="garantia_registrada_en", read_only=True)

    tipo_evento = TipoEventoResumenSerializer(read_only=True)
    grupo_evento = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = [
            "id", "estado", "vencida", "sitio", "cliente", "salon", "montaje", "aforo",
            "tipo_evento", "grupo_evento",
            "fecha_evento", "cantidad_personas", "validez_oferta", "bloqueo_hasta", "creado_en",
            "creado_por", "confirmado_en", "items", "subtotal", "impuestos", "total", "garantia",
            "garantia_minima", *CAMPOS_CANCELACION,
        ]
        read_only_fields = fields

    def get_grupo_evento(self, obj):
        return GrupoEventoResumenSerializer(obj.tipo_evento.grupo).data if obj.tipo_evento else None

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

    def get_garantia_minima(self, obj):
        if obj.estado not in ("cotizado", "bloqueado"):
            return None
        minima = garantia_minima(_totales(obj)["total"], obj.fecha_evento, timezone.localdate())
        return {"porcentaje": f"{minima['porcentaje']:g}", "monto": str(minima["monto"])}


class CotizacionListaSerializer(EstadoEfectivoMixin, CancelacionSalidaMixin, serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    salon_nombre = serializers.CharField(source="salon.nombre", read_only=True)
    montaje_nombre = serializers.CharField(source="montaje.nombre", read_only=True)
    vencida = serializers.BooleanField(read_only=True)
    total = serializers.SerializerMethodField()
    garantia = serializers.SerializerMethodField()
    confirmado_en = serializers.DateTimeField(source="garantia_registrada_en", read_only=True)

    tipo_evento = TipoEventoResumenSerializer(read_only=True)
    grupo_evento = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = [
            "id", "estado", "vencida", "cliente_nombre", "salon_nombre", "montaje_nombre",
            "tipo_evento", "grupo_evento",
            "fecha_evento", "cantidad_personas", "validez_oferta", "bloqueo_hasta",
            "creado_en", "confirmado_en", "total", "garantia", *CAMPOS_CANCELACION,
        ]
        read_only_fields = fields

    def get_grupo_evento(self, obj):
        return GrupoEventoResumenSerializer(obj.tipo_evento.grupo).data if obj.tipo_evento else None

    def get_total(self, obj):
        return str(_totales(obj)["total"])

    def get_garantia(self, obj):
        return garantia_de(obj)


class CotizacionEdicionSerializer(serializers.ModelSerializer):
    tipo_evento = serializers.PrimaryKeyRelatedField(
        queryset=TipoEvento.objects.select_related("grupo"), required=False
    )

    class Meta:
        model = Cotizacion
        fields = ["validez_oferta", "tipo_evento"]
        extra_kwargs = {"validez_oferta": {"required": False, "allow_null": False}}

    def validate_tipo_evento(self, value):
        return validar_tipo_evento_activo(value)

    def validate(self, attrs):
        no_permitidos = set(self.initial_data) - set(self.fields)
        if no_permitidos:
            raise serializers.ValidationError(
                {campo: ["Este campo no se puede modificar."] for campo in sorted(no_permitidos)}
            )

        if "validez_oferta" in attrs:
            error = validar_validez_oferta(attrs["validez_oferta"], self.instance.fecha_evento)
            if error:
                raise serializers.ValidationError({"validez_oferta": [error]})

        return attrs


class AceptacionSerializer(serializers.Serializer):
    TIPO_CHOICES = ["transferencia", "tarjeta", "consignacion", "efectivo"]

    tipo = serializers.ChoiceField(choices=TIPO_CHOICES)
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_monto(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto debe ser mayor que 0.")
        return value


class BloqueoSerializer(serializers.Serializer):
    # Con hora: "2026-10-14T18:00:00-05:00". Sin zona, se toma la de Colombia (TIME_ZONE).
    bloqueo_hasta = serializers.DateTimeField()


class CancelacionSerializer(serializers.Serializer):
    penalizacion_pct = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal("0"), max_value=Decimal("100"),
        error_messages={
            "min_value": "La penalización debe estar entre 0 y 100.",
            "max_value": "La penalización debe estar entre 0 y 100.",
        },
    )
    motivo = serializers.CharField(
        max_length=LARGO_MAXIMO_MOTIVO,
        error_messages={
            "blank": "Escribe el motivo de la cancelación.",
            "required": "Escribe el motivo de la cancelación.",
            "max_length": f"El motivo admite máximo {LARGO_MAXIMO_MOTIVO} caracteres.",
        },
    )


class AnulacionSerializer(serializers.Serializer):
    motivo = serializers.CharField(
        max_length=LARGO_MAXIMO_MOTIVO,
        error_messages={
            "blank": "Escribe el motivo de la anulación.",
            "required": "Escribe el motivo de la anulación.",
            "max_length": f"El motivo admite máximo {LARGO_MAXIMO_MOTIVO} caracteres.",
        },
    )


class MovimientoSerializer(serializers.ModelSerializer):
    usuario = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoCotizacion
        fields = ["id", "tipo", "usuario", "fecha", "detalle"]

    def get_usuario(self, obj):
        return obj.usuario.username if obj.usuario else "sistema"


# Lo mismo que ve el administrador, sin los datos internos.

CAMPOS_INTERNOS = ("creado_por", "cancelado_por", "garantia_minima")


def sin_datos_internos(data):
    for campo in CAMPOS_INTERNOS:
        data.pop(campo, None)
    if data.get("garantia"):
        data["garantia"] = {k: v for k, v in data["garantia"].items() if k != "registrada_por"}
    return data


class MiCotizacionListaSerializer(CotizacionListaSerializer):
    sitio_nombre = serializers.CharField(source="sitio.nombre", read_only=True)

    class Meta(CotizacionListaSerializer.Meta):
        fields = [*CotizacionListaSerializer.Meta.fields, "sitio_nombre"]
        read_only_fields = fields

    def to_representation(self, instance):
        return sin_datos_internos(super().to_representation(instance))


class MiCotizacionDetalleSerializer(CotizacionDetalleSerializer):
    def to_representation(self, instance):
        return sin_datos_internos(super().to_representation(instance))

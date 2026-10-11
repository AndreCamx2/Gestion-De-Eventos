from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response

from apps.usuarios.permissions import EsAdministrador

from .models import Cotizacion
from .serializers import (
    AceptacionSerializer, CotizacionCalendarioSerializer, CotizacionCrearSerializer, CotizacionDetalleSerializer,
    CotizacionListaSerializer, CotizacionVigenciaSerializer,
)


class Conflicto(APIException):
    """409: la petición es válida pero choca con el estado actual de la cotización."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "La cotización no admite esta operación en su estado actual."
    default_code = "conflicto"


ESTADO_EN_FEMENINO = {"bloqueado": "bloqueada", "confirmado": "confirmada", "cancelado": "cancelada"}


def exigir_estado_cotizado(cotizacion):
    if cotizacion.estado != "cotizado":
        raise Conflicto(f"La cotización está {ESTADO_EN_FEMENINO.get(cotizacion.estado, cotizacion.estado)}.")


class CotizacionCalendarioView(generics.ListAPIView):
    serializer_class = CotizacionCalendarioSerializer
    # Muestra clientes y fechas de todos los eventos: solo para administradores.
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        queryset = Cotizacion.objects.exclude(estado="cancelado")

        salon = self.request.query_params.get("salon")
        if salon:
            queryset = queryset.filter(salon=salon)

        desde = self.request.query_params.get("desde")
        if desde:
            queryset = queryset.filter(fecha_evento__gte=desde)

        hasta = self.request.query_params.get("hasta")
        if hasta:
            queryset = queryset.filter(fecha_evento__lte=hasta)

        return queryset


def cotizaciones_con_relaciones():
    """Trae en pocas consultas todo lo que muestran el detalle y el listado (evita N+1)."""
    return (
        Cotizacion.objects
        .select_related("sitio", "cliente", "salon", "montaje", "usuario", "garantia_registrada_por")
        .prefetch_related("items__concepto")
    )


def _fecha_param(params, nombre):
    valor = params.get(nombre)
    if not valor:
        return None
    fecha = parse_date(valor)
    if fecha is None:
        raise ValidationError({nombre: ["Fecha inválida. Usa el formato AAAA-MM-DD."]})
    return fecha


class CotizacionListCreateView(generics.ListCreateAPIView):
    """Listado con filtros (?estado, ?cliente, ?desde, ?hasta) y creación de cotizaciones."""

    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CotizacionCrearSerializer
        return CotizacionListaSerializer

    def get_queryset(self):
        params = self.request.query_params
        queryset = cotizaciones_con_relaciones().order_by("fecha_evento", "id")

        estado = params.get("estado")
        if estado:
            if estado not in dict(Cotizacion.ESTADO_CHOICES):
                raise ValidationError({"estado": [f"Estado inválido: {estado}."]})
            queryset = queryset.filter(estado=estado)

        cliente = params.get("cliente")
        if cliente:
            if not cliente.isdigit():
                raise ValidationError({"cliente": ["Debe ser el id numérico del cliente."]})
            queryset = queryset.filter(cliente_id=cliente)

        desde = _fecha_param(params, "desde")
        if desde:
            queryset = queryset.filter(fecha_evento__gte=desde)

        hasta = _fecha_param(params, "hasta")
        if hasta:
            queryset = queryset.filter(fecha_evento__lte=hasta)

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cotizacion = serializer.save()
        detalle = cotizaciones_con_relaciones().get(pk=cotizacion.pk)
        return Response(CotizacionDetalleSerializer(detalle).data, status=status.HTTP_201_CREATED)


class CotizacionDetailView(generics.RetrieveUpdateAPIView):
    """Detalle y cambio de vigencia (PATCH). Sin PUT ni DELETE."""

    queryset = cotizaciones_con_relaciones()
    serializer_class = CotizacionDetalleSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    http_method_names = ["get", "patch", "head", "options"]

    def partial_update(self, request, *args, **kwargs):
        cotizacion = self.get_object()
        # Se permite aunque esté vencida: así se extiende una oferta que ya venció.
        exigir_estado_cotizado(cotizacion)
        serializer = CotizacionVigenciaSerializer(cotizacion, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CotizacionDetalleSerializer(self.get_queryset().get(pk=cotizacion.pk)).data)


class CotizacionAceptacionView(generics.GenericAPIView):
    """Registra la garantía y confirma la cotización (estado "confirmado")."""

    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def post(self, request, *args, **kwargs):
        with transaction.atomic():
            # select_for_update bloquea la fila: dos aceptaciones simultáneas no se pisan.
            cotizacion = get_object_or_404(Cotizacion.objects.select_for_update(), pk=kwargs["pk"])

            serializer = AceptacionSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            exigir_estado_cotizado(cotizacion)
            if cotizacion.vencida:
                raise Conflicto("La cotización está vencida.")

            cotizacion.garantia_tipo = serializer.validated_data["tipo"]
            cotizacion.garantia_monto = serializer.validated_data["monto"]
            cotizacion.garantia_registrada_en = timezone.now()
            cotizacion.garantia_registrada_por = request.user
            cotizacion.estado = "confirmado"
            try:
                # Atomic interno (savepoint): si choca con uq_salon_fecha_confirmado,
                # respondemos 409 aquí en vez del 400 genérico del manejador global.
                with transaction.atomic():
                    cotizacion.save(update_fields=[
                        "garantia_tipo", "garantia_monto", "garantia_registrada_en",
                        "garantia_registrada_por", "estado",
                    ])
            except IntegrityError:
                raise Conflicto("El salón ya está confirmado para esa fecha.")

        return Response(CotizacionDetalleSerializer(cotizaciones_con_relaciones().get(pk=cotizacion.pk)).data)

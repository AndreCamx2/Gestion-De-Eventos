from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.usuarios.permissions import EsAdministrador

from .models import Cotizacion
from .serializers import (
    CotizacionCalendarioSerializer, CotizacionCrearSerializer, CotizacionDetalleSerializer,
    CotizacionListaSerializer,
)


class CotizacionCalendarioView(generics.ListAPIView):
    serializer_class = CotizacionCalendarioSerializer
    permission_classes = [permissions.IsAuthenticated]

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
        .select_related("sitio", "cliente", "salon", "montaje", "usuario")
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


class CotizacionDetailView(generics.RetrieveAPIView):
    queryset = cotizaciones_con_relaciones()
    serializer_class = CotizacionDetalleSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.exceptions import Conflicto
from apps.sitios.acceso import filtrar_por_sitio
from apps.usuarios.permissions import EsAdministrador

from . import estados
from .models import Cotizacion
from .serializers import (
    AceptacionSerializer, BloqueoSerializer, CancelacionSerializer, CotizacionCalendarioSerializer,
    CotizacionCrearSerializer, CotizacionDetalleSerializer, CotizacionListaSerializer, CotizacionVigenciaSerializer,
    MovimientoSerializer,
)


def exigir_estado_cotizado(cotizacion):
    if cotizacion.estado != "cotizado":
        raise Conflicto(f"La cotización está {estados.en_femenino(cotizacion.estado)}.")


class CotizacionCalendarioView(generics.ListAPIView):
    serializer_class = CotizacionCalendarioSerializer
    # Muestra clientes y fechas de los eventos de sus sitios: solo para administradores.
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        estados.liberar_bloqueos_vencidos()
        # Un ?salon= de otro sitio devuelve una lista vacía: el filtro por sitio va primero.
        # select_related: sin él, cada fila hace una consulta por cliente, salón y montaje.
        queryset = filtrar_por_sitio(
            Cotizacion.objects.exclude(estado="cancelado").select_related("cliente", "salon", "montaje"),
            self.request.user,
        )

        # Se validan como en el listado: un valor mal formado daba 500 (SGDE-14).
        params = self.request.query_params
        salon = _id_param(params, "salon", "Debe ser el id numérico del salón.")
        if salon:
            queryset = queryset.filter(salon_id=salon)
        return filtrar_por_fechas(queryset, params)


def cotizaciones_con_relaciones():
    """Trae en pocas consultas todo lo que muestran el detalle y el listado (evita N+1)."""
    return (
        Cotizacion.objects
        .select_related(
            "sitio", "cliente", "salon", "montaje", "usuario", "garantia_registrada_por", "cancelado_por",
        )
        .prefetch_related("items__concepto")
    )


def cotizaciones_del_usuario(usuario):
    """Las cotizaciones de los sitios del usuario: un id de otro sitio da 404.

    Antes libera los bloqueos vencidos, para que el listado y el detalle muestren
    el estado real (no hay tareas programadas en Render Free).
    """
    estados.liberar_bloqueos_vencidos()
    return filtrar_por_sitio(cotizaciones_con_relaciones(), usuario)


def _fecha_param(params, nombre):
    valor = params.get(nombre)
    if not valor:
        return None
    try:
        fecha = parse_date(valor)
    except ValueError:
        # Con el formato correcto pero imposible (2026-13-40) parse_date lanza en vez de devolver None.
        fecha = None
    if fecha is None:
        raise ValidationError({nombre: ["Fecha inválida. Usa el formato AAAA-MM-DD."]})
    return fecha


def _id_param(params, nombre, mensaje):
    """Un filtro por id: vacío → None; no numérico → 400 con `mensaje`."""
    valor = params.get(nombre)
    if not valor:
        return None
    if not valor.isdigit():
        raise ValidationError({nombre: [mensaje]})
    return int(valor)


def filtrar_por_fechas(queryset, params):
    """Aplica ?desde y ?hasta sobre fecha_evento (inclusive). Inválidas o invertidas → 400."""
    desde = _fecha_param(params, "desde")
    hasta = _fecha_param(params, "hasta")
    if desde and hasta and desde > hasta:
        raise ValidationError({"hasta": ["La fecha final no puede ser anterior a la inicial."]})
    if desde:
        queryset = queryset.filter(fecha_evento__gte=desde)
    if hasta:
        queryset = queryset.filter(fecha_evento__lte=hasta)
    return queryset


class CotizacionListCreateView(generics.ListCreateAPIView):
    """Listado con filtros (?estado, ?cliente, ?salon, ?desde, ?hasta) y creación de cotizaciones.

    Con ?salon es el histórico del salón (SGDE-62): un salón de otro sitio da la lista vacía.
    """

    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CotizacionCrearSerializer
        return CotizacionListaSerializer

    def get_queryset(self):
        params = self.request.query_params
        queryset = cotizaciones_del_usuario(self.request.user).order_by("fecha_evento", "id")

        estado = params.get("estado")
        if estado:
            if estado not in dict(Cotizacion.ESTADO_CHOICES):
                raise ValidationError({"estado": [f"Estado inválido: {estado}."]})
            queryset = queryset.filter(estado=estado)

        cliente = _id_param(params, "cliente", "Debe ser el id numérico del cliente.")
        if cliente:
            queryset = queryset.filter(cliente_id=cliente)

        salon = _id_param(params, "salon", "Debe ser el id numérico del salón.")
        if salon:
            queryset = queryset.filter(salon_id=salon)

        return filtrar_por_fechas(queryset, params)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cotizacion = serializer.save()
        detalle = cotizaciones_con_relaciones().get(pk=cotizacion.pk)
        return Response(CotizacionDetalleSerializer(detalle).data, status=status.HTTP_201_CREATED)


class CotizacionDetailView(generics.RetrieveUpdateAPIView):
    """Detalle y cambio de vigencia (PATCH). Sin PUT ni DELETE."""

    serializer_class = CotizacionDetalleSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return cotizaciones_del_usuario(self.request.user)

    def partial_update(self, request, *args, **kwargs):
        estados.liberar_bloqueos_vencidos()
        with transaction.atomic():
            cotizacion = estados.tomar_para_cambio(
                filtrar_por_sitio(Cotizacion.objects.all(), request.user), kwargs["pk"]
            )
            # Se permite aunque esté vencida: así se extiende una oferta que ya venció.
            exigir_estado_cotizado(cotizacion)
            anterior = cotizacion.validez_oferta
            serializer = CotizacionVigenciaSerializer(cotizacion, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            estados.registrar(
                cotizacion, "vigencia", request.user,
                f"Vigencia: {estados.fecha_corta(anterior)} → {estados.fecha_corta(cotizacion.validez_oferta)}.",
            )
        return Response(CotizacionDetalleSerializer(cotizaciones_con_relaciones().get(pk=cotizacion.pk)).data)


class AccionSobreCotizacionView(generics.GenericAPIView):
    """Base de las acciones que cambian el estado (aceptar, bloquear, liberar).

    `ejecutar` corre dentro de transaction.atomic() con el Salón y la Cotización
    bloqueados (estados.tomar_para_cambio). Una cotización de otro sitio da 404.
    Responde con el detalle actualizado.
    """

    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def ejecutar(self, cotizacion, datos):
        raise NotImplementedError

    def accion(self, datos=None):
        # Fuera de la transacción de la acción: ver el orden de bloqueo en estados.py.
        estados.liberar_bloqueos_vencidos()
        with transaction.atomic():
            cotizacion = estados.tomar_para_cambio(
                filtrar_por_sitio(Cotizacion.objects.all(), self.request.user), self.kwargs["pk"]
            )
            self.ejecutar(cotizacion, datos)
        return Response(CotizacionDetalleSerializer(cotizaciones_con_relaciones().get(pk=cotizacion.pk)).data)

    def validar(self, serializer_class):
        serializer = serializer_class(data=self.request.data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data


class CotizacionAceptacionView(AccionSobreCotizacionView):
    """Registra la garantía y confirma la cotización, desde cotizada o bloqueada (SGDE-20)."""

    def post(self, request, *args, **kwargs):
        return self.accion(self.validar(AceptacionSerializer))

    def ejecutar(self, cotizacion, datos):
        estados.aceptar(cotizacion, datos["tipo"], datos["monto"], self.request.user)


class CotizacionBloqueoView(AccionSobreCotizacionView):
    """POST bloquea el salón y la fecha hasta `bloqueo_hasta`; DELETE lo libera a mano."""

    def post(self, request, *args, **kwargs):
        return self.accion(self.validar(BloqueoSerializer))

    def delete(self, request, *args, **kwargs):
        return self.accion()

    def ejecutar(self, cotizacion, datos):
        if self.request.method == "POST":
            estados.bloquear(cotizacion, datos["bloqueo_hasta"], self.request.user)
        else:
            estados.liberar(cotizacion, self.request.user)


class CotizacionCancelacionView(AccionSobreCotizacionView):
    """Cancela un evento confirmado con su penalización y motivo (SGDE-61)."""

    def post(self, request, *args, **kwargs):
        return self.accion(self.validar(CancelacionSerializer))

    def ejecutar(self, cotizacion, datos):
        estados.cancelar(cotizacion, datos["penalizacion_pct"], datos["motivo"], self.request.user)


class CotizacionMovimientosView(generics.ListAPIView):
    """Los movimientos de una cotización, en orden (SGDE-62). Otro sitio da 404."""

    serializer_class = MovimientoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        # Libera antes, para que un bloqueo vencido ya muestre su movimiento "liberada".
        estados.liberar_bloqueos_vencidos()
        cotizacion = get_object_or_404(filtrar_por_sitio(Cotizacion.objects.all(), self.request.user), pk=self.kwargs["pk"])
        return cotizacion.movimientos.select_related("usuario")

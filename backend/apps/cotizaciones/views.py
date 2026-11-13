from django.db import transaction
from django.db.models import Prefetch
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.exceptions import Conflicto
from apps.core.pagination import PaginaEstandar
from apps.sitios.acceso import filtrar_por_sitio
from apps.usuarios.permissions import EsAdministrador, EsCliente

from . import estados
from .models import Cotizacion, GrupoEvento, TipoEvento
from .serializers import (
    _totales, AceptacionSerializer, AnulacionSerializer, BloqueoSerializer, CancelacionSerializer, CotizacionCalendarioSerializer,
    CotizacionCrearSerializer, CotizacionDetalleSerializer, CotizacionEdicionSerializer,
    CotizacionListaSerializer, GrupoEventoConTiposSerializer, MiCotizacionDetalleSerializer,
    MiCotizacionListaSerializer, MovimientoSerializer,
)


def exigir_estado_cotizado(cotizacion):
    if cotizacion.estado != "cotizado":
        raise Conflicto(f"La cotización está {estados.en_femenino(cotizacion.estado)}.")


def nombre_tipo(tipo):
    return str(tipo) if tipo else "Sin clasificar"

class CotizacionCalendarioView(generics.ListAPIView):
    serializer_class = CotizacionCalendarioSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        # Un ?salon= de otro sitio devuelve una lista vacía: el filtro por sitio va primero.
        queryset = filtrar_por_sitio(
            Cotizacion.objects.exclude(estado="cancelado").select_related("cliente", "salon", "montaje"),
            self.request.user,
        )

        params = self.request.query_params
        salon = _id_param(params, "salon", "Debe ser el id numérico del salón.")
        if salon:
            queryset = queryset.filter(salon_id=salon)
        return filtrar_por_fechas(queryset, params)


def cotizaciones_con_relaciones():
    return (
        Cotizacion.objects
                .select_related(
            "sitio", "cliente", "salon", "montaje", "usuario", "garantia_registrada_por", "cancelado_por",
            "tipo_evento__grupo",
        )

        .prefetch_related("items__concepto")
    )


def cotizaciones_del_usuario(usuario):
    """Las de los sitios del usuario. No libera bloqueos vencidos: un GET no escribe."""
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
    valor = params.get(nombre)
    if not valor:
        return None
    if not valor.isdigit():
        raise ValidationError({nombre: [mensaje]})
    return int(valor)


def filtrar_por_fechas(queryset, params):
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
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    pagination_class = PaginaEstandar

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
            queryset = queryset.con_estado_efectivo(estado)

        cliente = _id_param(params, "cliente", "Debe ser el id numérico del cliente.")
        if cliente:
            queryset = queryset.filter(cliente_id=cliente)

        salon = _id_param(params, "salon", "Debe ser el id numérico del salón.")
        if salon:
            queryset = queryset.filter(salon_id=salon)

        tipo_evento = _id_param(params, "tipo_evento", "Debe ser el id numérico del tipo de evento.")
        if tipo_evento:
            queryset = queryset.filter(tipo_evento_id=tipo_evento)

        grupo_evento = _id_param(params, "grupo_evento", "Debe ser el id numérico del grupo de evento.")
        if grupo_evento:
            queryset = queryset.filter(tipo_evento__grupo_id=grupo_evento)

        return filtrar_por_fechas(queryset, params)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        # validate() bloquea salón y montaje: validar y guardar van en la misma transacción.
        with transaction.atomic():
            serializer.is_valid(raise_exception=True)
            cotizacion = serializer.save()
        detalle = cotizaciones_con_relaciones().get(pk=cotizacion.pk)
        return Response(CotizacionDetalleSerializer(detalle).data, status=status.HTTP_201_CREATED)


class CotizacionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CotizacionDetalleSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return cotizaciones_del_usuario(self.request.user)

    def partial_update(self, request, *args, **kwargs):
        estados.liberar_bloqueos_vencidos(usuario=request.user)
        with transaction.atomic():
            cotizacion = estados.tomar_para_cambio(
                filtrar_por_sitio(Cotizacion.objects.all(), request.user), kwargs["pk"]
            )
            # Se permite aunque esté vencida: así se extiende una oferta que ya venció.
            exigir_estado_cotizado(cotizacion)
            estados.exigir_salon_activo(cotizacion)
            anterior_validez = cotizacion.validez_oferta
            anterior_tipo = nombre_tipo(cotizacion.tipo_evento)

            serializer = CotizacionEdicionSerializer(cotizacion, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)

            if serializer.validated_data:
                serializer.save()

            if "validez_oferta" in request.data:
                estados.registrar(
                    cotizacion, "vigencia", request.user,
                    f"Vigencia: {estados.fecha_corta(anterior_validez)} → {estados.fecha_corta(cotizacion.validez_oferta)}.",
                )
            if "tipo_evento" in request.data:
                estados.registrar(
                    cotizacion, "tipo_evento", request.user,
                    f"Tipo de evento: {anterior_tipo} → {nombre_tipo(cotizacion.tipo_evento)}.",
                )
        return Response(CotizacionDetalleSerializer(cotizaciones_con_relaciones().get(pk=cotizacion.pk)).data)


class AccionSobreCotizacionView(generics.GenericAPIView):
    """Acciones que cambian el estado, con el Salón y la Cotización bloqueados."""

    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def ejecutar(self, cotizacion, datos):
        raise NotImplementedError

    def accion(self, datos=None):
        # Fuera de la transacción de la acción: ver el orden de bloqueo en estados.py.
        estados.liberar_bloqueos_vencidos(usuario=self.request.user)
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
    def post(self, request, *args, **kwargs):
        return self.accion(self.validar(AceptacionSerializer))

    def ejecutar(self, cotizacion, datos):
        estados.aceptar(cotizacion, datos["tipo"], datos["monto"], self.request.user)


class CotizacionBloqueoView(AccionSobreCotizacionView):
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
    def post(self, request, *args, **kwargs):
        return self.accion(self.validar(CancelacionSerializer))

    def ejecutar(self, cotizacion, datos):
        estados.cancelar(cotizacion, datos["penalizacion_pct"], datos["motivo"], self.request.user)


class CotizacionAnulacionView(AccionSobreCotizacionView):
    def post(self, request, *args, **kwargs):
        return self.accion(self.validar(AnulacionSerializer))

    def ejecutar(self, cotizacion, datos):
        estados.anular(cotizacion, datos["motivo"], self.request.user)


class CotizacionEdicionView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def put(self, request, *args, **kwargs):
        estados.liberar_bloqueos_vencidos(usuario=request.user)
        with transaction.atomic():
            cotizacion = estados.tomar_para_cambio(
                filtrar_por_sitio(Cotizacion.objects.all(), request.user), kwargs["pk"]
            )
            exigir_estado_cotizado(cotizacion)
            serializer = CotizacionCrearSerializer(cotizacion, data=request.data, context=self.get_serializer_context())
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(CotizacionDetalleSerializer(cotizaciones_con_relaciones().get(pk=cotizacion.pk)).data)


class CotizacionMovimientosView(generics.ListAPIView):
    serializer_class = MovimientoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        cotizacion = get_object_or_404(filtrar_por_sitio(Cotizacion.objects.all(), self.request.user), pk=self.kwargs["pk"])
        return cotizacion.movimientos.select_related("usuario")


class TipoEventoListView(generics.ListAPIView):
    serializer_class = GrupoEventoConTiposSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    pagination_class = None

    def get_queryset(self):
        tipos_activos = TipoEvento.objects.filter(activo=True).order_by("id")
        return (
            GrupoEvento.objects.filter(activo=True, tipos__activo=True)
            .distinct()
            .prefetch_related(Prefetch("tipos", queryset=tipos_activos))
        )


def mis_cotizaciones(usuario):
    """El cliente sale del token, nunca de un id que mande el frontend."""
    return cotizaciones_con_relaciones().filter(cliente__usuario=usuario)


class MisCotizacionesView(generics.ListAPIView):
    serializer_class = MiCotizacionListaSerializer
    permission_classes = [permissions.IsAuthenticated, EsCliente]

    def get_queryset(self):
        return mis_cotizaciones(self.request.user).order_by("fecha_evento", "id")


class MiCotizacionDetalleView(generics.RetrieveAPIView):
    serializer_class = MiCotizacionDetalleSerializer
    permission_classes = [permissions.IsAuthenticated, EsCliente]

    def get_queryset(self):
        return mis_cotizaciones(self.request.user)

class ReporteIngresosPorTipoEventoView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get(self, request, *args, **kwargs):
        confirmadas = filtrar_por_sitio(Cotizacion.objects.filter(estado="confirmado"), request.user)
        confirmadas = filtrar_por_fechas(confirmadas, request.query_params)
        confirmadas = confirmadas.select_related("tipo_evento__grupo").prefetch_related("items")

        grupos = {}
        for cotizacion in confirmadas:
            tipo = cotizacion.tipo_evento
            grupo = grupos.setdefault(tipo.id if tipo else None, {
                "tipo_evento_id": tipo.id if tipo else None,
                "tipo_evento_nombre": tipo.nombre if tipo else "Sin clasificar",
                "grupo_evento_nombre": tipo.grupo.nombre if tipo else "Sin clasificar",
                "cantidad_eventos": 0,
                "ingreso": Decimal("0.00"),
            })
            grupo["cantidad_eventos"] += 1
            grupo["ingreso"] += _totales(cotizacion)["total"]

        gran_total = sum((g["ingreso"] for g in grupos.values()), Decimal("0.00"))
        total_eventos = sum(g["cantidad_eventos"] for g in grupos.values())

        detalle = []
        for grupo in sorted(grupos.values(), key=lambda g: (-g["ingreso"], g["tipo_evento_id"] is None, g["tipo_evento_id"] or 0)):
            ingreso = grupo.pop("ingreso")
            porcentaje = (ingreso / gran_total * 100).quantize(Decimal("0.01")) if gran_total else Decimal("0")
            detalle.append({**grupo, "ingreso_total": str(ingreso), "porcentaje_ingreso": float(porcentaje)})

        ticket_promedio = (gran_total / total_eventos).quantize(Decimal("0.01")) if total_eventos else Decimal("0.00")
        return Response({
            "gran_total": str(gran_total),
            "total_eventos": total_eventos,
            "ticket_promedio": str(ticket_promedio),
            "detalle": detalle,
        })

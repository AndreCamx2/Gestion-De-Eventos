from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.formats import date_format
from rest_framework.exceptions import ValidationError

from apps.core.exceptions import Conflicto
from apps.salones.models import Salon

from .models import Cotizacion, MovimientoCotizacion
from .services import garantia_minima, totales_cotizacion
from apps.sitios.acceso import filtrar_por_sitio

ESTADO_EN_FEMENINO = {
    "cotizado": "cotizada", "bloqueado": "bloqueada", "confirmado": "confirmada", "cancelado": "cancelada",
}


def en_femenino(estado):
    return ESTADO_EN_FEMENINO.get(estado, estado)


def fecha_hora(valor):
    return date_format(timezone.localtime(valor), "d/m/Y H:i")


def fecha_corta(valor):
    return valor.strftime("%d/%m/%Y") if valor else "sin fecha"


def pesos(valor):
    entero, _, centavos = f"{valor:,.2f}".partition(".")
    texto = entero.replace(",", ".")
    return f"$ {texto}" if centavos == "00" else f"$ {texto},{centavos}"


def registrar(cotizacion, tipo, usuario, detalle=""):
    MovimientoCotizacion.objects.create(cotizacion=cotizacion, tipo=tipo, usuario=usuario, detalle=detalle[:255])


def liberar_bloqueos_vencidos(ahora=None, usuario=None):
    """Pasa a cotizado todo bloqueo vencido y devuelve cuántos liberó.

    Los GET no la llaman: un bloqueo vencido ya se muestra como cotizado sin escribir.
    Con skip_locked se salta las filas que otra petición tiene tomadas.
    """
    ahora = ahora or timezone.now()
    with transaction.atomic():
        candidatas = Cotizacion.objects.filter(estado="bloqueado", bloqueo_hasta__lte=ahora)
        if usuario is not None:
            # Subconsulta: el FOR UPDATE solo bloquea cotizaciones, sin joins.
            candidatas = Cotizacion.objects.filter(pk__in=filtrar_por_sitio(candidatas, usuario).values("pk"))
        vencidas = list(candidatas.select_for_update(skip_locked=True))
        # Una por una (no un update masivo): cada una deja su movimiento del sistema.
        for cotizacion in vencidas:
            _liberar_por_vencimiento(cotizacion)
    return len(vencidas)


def _pasar_a_cotizado(cotizacion):
    cotizacion.estado = "cotizado"
    cotizacion.bloqueo_hasta = None
    cotizacion.save(update_fields=["estado", "bloqueo_hasta"])


def _liberar_por_vencimiento(cotizacion):
    hasta = cotizacion.bloqueo_hasta
    _pasar_a_cotizado(cotizacion)
    registrar(cotizacion, "liberada", None, f"El bloqueo venció ({fecha_hora(hasta)}).")


def _liberar_si_vencio(cotizacion, ahora):
    if cotizacion.estado == "bloqueado" and cotizacion.bloqueo_hasta and cotizacion.bloqueo_hasta <= ahora:
        _liberar_por_vencimiento(cotizacion)


def tomar_para_cambio(queryset, pk):
    salon_id = get_object_or_404(queryset.values_list("salon_id", flat=True), pk=pk)
    salon = Salon.objects.select_for_update().get(pk=salon_id)
    cotizacion = Cotizacion.objects.select_for_update().get(pk=pk)
    cotizacion.salon = salon  # La fila ya bloqueada: su `activo` no cambia hasta terminar.
    _liberar_si_vencio(cotizacion, timezone.now())
    return cotizacion


def exigir_salon_activo(cotizacion):
    if not cotizacion.salon.activo:
        raise Conflicto("El salón está dado de baja.")


def _exigir_fecha_libre(cotizacion, ahora):
    otras = (
        Cotizacion.objects.filter(salon_id=cotizacion.salon_id, fecha_evento=cotizacion.fecha_evento)
        .exclude(pk=cotizacion.pk)
    )
    if otras.filter(estado="confirmado").exists():
        raise Conflicto("El salón ya está confirmado para esa fecha.")
    bloqueo = otras.filter(estado="bloqueado", bloqueo_hasta__gt=ahora).order_by("-bloqueo_hasta").first()
    if bloqueo:
        raise Conflicto(
            f"El salón está bloqueado para esa fecha por otra cotización hasta {fecha_hora(bloqueo.bloqueo_hasta)}."
        )


def bloquear(cotizacion, bloqueo_hasta, usuario):
    if cotizacion.estado != "cotizado":
        raise Conflicto(f"Solo se puede bloquear una cotización cotizada; esta está {en_femenino(cotizacion.estado)}.")
    exigir_salon_activo(cotizacion)
    if cotizacion.vencida:
        raise Conflicto("La cotización está vencida: extiende su vigencia antes de bloquear.")

    ahora = timezone.now()
    if bloqueo_hasta <= ahora:
        raise ValidationError({"bloqueo_hasta": ["Debe ser posterior al momento actual."]})
    if timezone.localtime(bloqueo_hasta).date() > cotizacion.fecha_evento:
        raise ValidationError({"bloqueo_hasta": ["No puede ser posterior al día del evento."]})
    _exigir_fecha_libre(cotizacion, ahora)

    cotizacion.estado = "bloqueado"
    cotizacion.bloqueo_hasta = bloqueo_hasta
    cotizacion.save(update_fields=["estado", "bloqueo_hasta"])
    registrar(cotizacion, "bloqueada", usuario, f"Bloqueada hasta {fecha_hora(bloqueo_hasta)}.")


def liberar(cotizacion, usuario):
    if cotizacion.estado != "bloqueado":
        raise Conflicto(f"La cotización no está bloqueada; está {en_femenino(cotizacion.estado)}.")
    _pasar_a_cotizado(cotizacion)
    registrar(cotizacion, "liberada", usuario, "Liberada a mano.")


def _exigir_garantia_minima(cotizacion, monto):
    total = totales_cotizacion(cotizacion.items.all())["total"]
    minima = garantia_minima(total, cotizacion.fecha_evento, timezone.localdate())
    if monto < minima["monto"]:
        raise ValidationError({"monto": [
            f"La garantía mínima es {pesos(minima['monto'])} ({minima['porcentaje']:g}% del total)."
        ]})
    if monto > total:
        raise ValidationError({"monto": [f"La garantía no puede superar el total ({pesos(total)})."]})


def aceptar(cotizacion, tipo, monto, usuario):
    """Registra la garantía y confirma. Una bloqueada se acepta aunque su vigencia haya
    pasado: el bloqueo sostiene la oferta.
    """
    if cotizacion.estado not in ("cotizado", "bloqueado"):
        raise Conflicto(f"La cotización está {en_femenino(cotizacion.estado)}.")
    exigir_salon_activo(cotizacion)
    if cotizacion.vencida:
        raise Conflicto("La cotización está vencida.")
    _exigir_fecha_libre(cotizacion, timezone.now())
    _exigir_garantia_minima(cotizacion, monto)

    cotizacion.garantia_tipo = tipo
    cotizacion.garantia_monto = monto
    cotizacion.garantia_registrada_en = timezone.now()
    cotizacion.garantia_registrada_por = usuario
    cotizacion.estado = "confirmado"
    cotizacion.bloqueo_hasta = None
    try:
        # Si aun así choca con uq_salon_fecha_confirmado, 409 y no el 400 genérico.
        with transaction.atomic():
            cotizacion.save(update_fields=[
                "garantia_tipo", "garantia_monto", "garantia_registrada_en",
                "garantia_registrada_por", "estado", "bloqueo_hasta",
            ])
    except IntegrityError:
        raise Conflicto("El salón ya está confirmado para esa fecha.")
    registrar(cotizacion, "confirmada", usuario, f"Garantía: {tipo}, {pesos(monto)}.")


def anular(cotizacion, motivo, usuario):
    if cotizacion.estado not in ("cotizado", "bloqueado"):
        raise Conflicto(
            "Solo se puede anular una cotización cotizada o bloqueada; "
            f"esta está {en_femenino(cotizacion.estado)}."
        )
    cotizacion.estado = "cancelado"
    cotizacion.bloqueo_hasta = None
    cotizacion.penalizacion_pct = None
    cotizacion.motivo_cancelacion = motivo
    cotizacion.cancelado_en = timezone.now()
    cotizacion.cancelado_por = usuario
    cotizacion.save(update_fields=[
        "estado", "bloqueo_hasta", "penalizacion_pct", "motivo_cancelacion", "cancelado_en", "cancelado_por",
    ])
    registrar(cotizacion, "anulada", usuario, f"Motivo: {motivo}")


def cancelar(cotizacion, penalizacion_pct, motivo, usuario):
    if cotizacion.estado != "confirmado":
        raise Conflicto(
            f"Solo se puede cancelar un evento confirmado; esta cotización está {en_femenino(cotizacion.estado)}."
        )
    cotizacion.estado = "cancelado"
    cotizacion.penalizacion_pct = penalizacion_pct
    cotizacion.motivo_cancelacion = motivo
    cotizacion.cancelado_en = timezone.now()
    cotizacion.cancelado_por = usuario
    cotizacion.save(update_fields=[
        "estado", "penalizacion_pct", "motivo_cancelacion", "cancelado_en", "cancelado_por",
    ])
    registrar(cotizacion, "cancelada", usuario, f"Penalización {penalizacion_pct} %. Motivo: {motivo}")

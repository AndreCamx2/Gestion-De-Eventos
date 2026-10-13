from django.db import transaction
from django.utils import timezone
from django.utils.formats import date_format
from rest_framework.exceptions import APIException, ValidationError

from apps.cotizaciones.models import Cotizacion
from apps.salones.models import Salon


class ConflictoDisponibilidad(APIException):
    """El salón no se puede bloquear (sobreventa o bloqueo vigente). HTTP 409."""
    status_code = 409
    default_code = "conflicto_disponibilidad"


def liberar_bloqueos_vencidos(ahora=None, salon_id=None):
    """Libera los bloqueos cuyo plazo ya venció. Devuelve cuántos liberó."""
    ahora = ahora or timezone.now()
    vencidos = Cotizacion.objects.filter(estado="bloqueado", bloqueo_hasta__lte=ahora)
    if salon_id is not None:
        vencidos = vencidos.filter(salon_id=salon_id)
    return vencidos.update(estado="cotizado", bloqueo_hasta=None)


def _fmt(dt):
    return date_format(timezone.localtime(dt), "d/m/Y H:i")


def bloquear_salon(cotizacion_id, bloqueo_hasta):
    """Bloquea temporalmente el salón de una cotización hasta `bloqueo_hasta`."""
    ahora = timezone.now()
    if bloqueo_hasta <= ahora:
        raise ValidationError(
            {"bloqueo_hasta": "La fecha/hora límite debe ser posterior al momento actual."}
        )

    with transaction.atomic():
        cot = Cotizacion.objects.select_related("salon").get(pk=cotizacion_id)
        # Se bloquea la fila del salón para que dos ejecutivos no bloqueen
        # el mismo salón y fecha al mismo tiempo.
        Salon.objects.select_for_update().get(pk=cot.salon_id)
        cot.refresh_from_db()

        liberar_bloqueos_vencidos(ahora=ahora, salon_id=cot.salon_id)
        cot.refresh_from_db()

        if cot.estado in ("confirmado", "cancelado"):
            raise ConflictoDisponibilidad(
                f"La cotización está {cot.estado}; no se puede bloquear."
            )
        if cot.estado == "bloqueado":
            raise ConflictoDisponibilidad(
                f"Esta cotización ya tiene un bloqueo vigente hasta {_fmt(cot.bloqueo_hasta)}."
            )

        otras = Cotizacion.objects.filter(
            salon_id=cot.salon_id, fecha_evento=cot.fecha_evento
        ).exclude(pk=cot.pk)

        if otras.filter(estado="confirmado").exists():
            raise ConflictoDisponibilidad(
                "Alerta de sobreventa: el salón ya está confirmado para otro evento en esa fecha."
            )
        vigente = otras.filter(estado="bloqueado", bloqueo_hasta__gt=ahora).first()
        if vigente:
            raise ConflictoDisponibilidad(
                f"El salón ya tiene un bloqueo vigente para esa fecha hasta {_fmt(vigente.bloqueo_hasta)}."
            )

        cot.estado = "bloqueado"
        cot.bloqueo_hasta = bloqueo_hasta
        cot.save(update_fields=["estado", "bloqueo_hasta"])
        return cot
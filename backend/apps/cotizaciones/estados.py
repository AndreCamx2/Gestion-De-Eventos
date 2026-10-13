"""Acciones que cambian el estado de una cotización: bloquear, liberar y aceptar.

El evento es la propia Cotizacion (no hay entidad Bloqueo): estas funciones solo
mueven su estado entre cotizado → bloqueado → confirmado (→ cancelado).
Parte de la lógica viene de apps/disponibilidad (SGDE-15, Felipe Bernal).

Cómo se usan desde una vista:

    liberar_bloqueos_vencidos()            # en su propia transacción, antes
    with transaction.atomic():
        cotizacion = tomar_para_cambio(queryset_del_usuario, pk)
        bloquear(cotizacion, hasta, usuario)

Orden de bloqueo de filas, igual en todas las acciones: primero el Salón y
después la Cotización. Con un solo orden, dos acciones simultáneas sobre el
mismo salón se esperan en fila en vez de bloquearse mutuamente (deadlock).
Por eso la liberación automática corre aparte: toma filas de cotización sin
pasar por el salón.
"""
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.formats import date_format
from rest_framework.exceptions import ValidationError

from apps.core.exceptions import Conflicto
from apps.salones.models import Salon

from .models import Cotizacion, MovimientoCotizacion

ESTADO_EN_FEMENINO = {
    "cotizado": "cotizada", "bloqueado": "bloqueada", "confirmado": "confirmada", "cancelado": "cancelada",
}


def en_femenino(estado):
    return ESTADO_EN_FEMENINO.get(estado, estado)


def fecha_hora(valor):
    """14/10/2026 18:00 en la hora de Colombia, para los mensajes."""
    return date_format(timezone.localtime(valor), "d/m/Y H:i")


def fecha_corta(valor):
    """14/10/2026, o "sin fecha" si es None."""
    return valor.strftime("%d/%m/%Y") if valor else "sin fecha"


def registrar(cotizacion, tipo, usuario, detalle=""):
    """Deja el movimiento (SGDE-62). Se llama dentro de la transacción de la acción.

    usuario=None significa que lo hizo el sistema.
    """
    MovimientoCotizacion.objects.create(cotizacion=cotizacion, tipo=tipo, usuario=usuario, detalle=detalle[:255])


def liberar_bloqueos_vencidos(ahora=None):
    """Pasa a `cotizado` toda cotización bloqueada cuyo `bloqueo_hasta` ya pasó.

    Render Free no tiene tareas programadas: se llama "al leer" (listado, detalle,
    calendario y antes de cada acción) y con `manage.py liberar_bloqueos`.
    skip_locked: si otra petición tiene tomada una fila, se salta; esa misma
    acción la libera al revisarla (`_liberar_si_vencio`). Devuelve cuántas liberó.
    """
    ahora = ahora or timezone.now()
    with transaction.atomic():
        vencidas = list(
            Cotizacion.objects.select_for_update(skip_locked=True)
            .filter(estado="bloqueado", bloqueo_hasta__lte=ahora)
        )
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
    """Dentro de transaction.atomic(): la cotización con su Salón y ella misma bloqueados.

    `queryset` ya viene filtrado por sitio: un id de otro sitio da 404. El primer
    get no bloquea; solo sirve para saber qué salón bloquear primero.
    """
    salon_id = get_object_or_404(queryset.values_list("salon_id", flat=True), pk=pk)
    salon = Salon.objects.select_for_update().get(pk=salon_id)
    cotizacion = Cotizacion.objects.select_for_update().get(pk=pk)
    cotizacion.salon = salon  # La fila ya bloqueada: su `activo` no cambia hasta terminar.
    _liberar_si_vencio(cotizacion, timezone.now())
    return cotizacion


def exigir_salon_activo(cotizacion):
    """409 si el salón está dado de baja (SGDE-99): no se bloquea, confirma ni extiende ahí.

    Dar de baja solo revisa las cotizaciones activas; sin esto, una cotizada vencida del
    salón podría extender su vigencia y confirmarse en un salón inactivo.
    """
    if not cotizacion.salon.activo:
        raise Conflicto("El salón está dado de baja.")


def _exigir_fecha_libre(cotizacion, ahora):
    """409 si el salón ya tiene esa fecha confirmada o bloqueada (vigente) por otra cotización."""
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
    """Bloquea el salón y la fecha de la cotización hasta `bloqueo_hasta` (SGDE-40/60/15)."""
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
    """Quita a mano el bloqueo: vuelve a `cotizado` (SGDE-40/60/15)."""
    if cotizacion.estado != "bloqueado":
        raise Conflicto(f"La cotización no está bloqueada; está {en_femenino(cotizacion.estado)}.")
    _pasar_a_cotizado(cotizacion)
    registrar(cotizacion, "liberada", usuario, "Liberada a mano.")


def aceptar(cotizacion, tipo, monto, usuario):
    """Registra la garantía y confirma (SGDE-20). Desde cotizada no vencida o bloqueada.

    Una bloqueada se acepta aunque su validez_oferta haya pasado: el bloqueo
    sostiene la oferta (decisión de Andrés, 2026-10-12).
    """
    if cotizacion.estado not in ("cotizado", "bloqueado"):
        raise Conflicto(f"La cotización está {en_femenino(cotizacion.estado)}.")
    exigir_salon_activo(cotizacion)
    if cotizacion.vencida:
        raise Conflicto("La cotización está vencida.")
    _exigir_fecha_libre(cotizacion, timezone.now())

    cotizacion.garantia_tipo = tipo
    cotizacion.garantia_monto = monto
    cotizacion.garantia_registrada_en = timezone.now()
    cotizacion.garantia_registrada_por = usuario
    cotizacion.estado = "confirmado"
    cotizacion.bloqueo_hasta = None
    try:
        # Savepoint: si aun así choca con uq_salon_fecha_confirmado, 409 aquí en vez
        # del 400 genérico del manejador global.
        with transaction.atomic():
            cotizacion.save(update_fields=[
                "garantia_tipo", "garantia_monto", "garantia_registrada_en",
                "garantia_registrada_por", "estado", "bloqueo_hasta",
            ])
    except IntegrityError:
        raise Conflicto("El salón ya está confirmado para esa fecha.")
    registrar(cotizacion, "confirmada", usuario, f"Garantía: {tipo}, {monto}.")


def cancelar(cotizacion, penalizacion_pct, motivo, usuario):
    """Cancela un evento confirmado con su penalización (SGDE-61).

    Al dejar de estar confirmada, el salón queda libre esa fecha: el constraint
    uq_salon_fecha_confirmado solo cuenta las confirmadas.
    """
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

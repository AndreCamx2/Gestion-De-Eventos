from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.sitios.models import Sitio
from apps.clientes.models import Cliente
from apps.salones.models import Salon, Montaje
from apps.catalogo.models import Concepto


class CotizacionQuerySet(models.QuerySet):
    def activas(self):
        """Las que todavía comprometen el salón: evento de hoy en adelante y, además,
        bloqueada, confirmada o cotizada no vencida (misma regla que `vencida`).

        Un evento pasado o una cotización vencida no cuentan. Bloquean quitar un
        montaje habilitado y bajar su aforo (SGDE-88).

        Un bloqueo vencido que todavía no se liberó en la base se trata como cotizado
        (SGDE-118): cuenta solo si la oferta sigue vigente.
        """
        hoy = timezone.localdate()
        ahora = timezone.now()
        oferta_vigente = models.Q(validez_oferta__isnull=True) | models.Q(validez_oferta__gte=hoy)
        # Misma regla que Cotizacion.bloqueo_vencido: sin bloqueo_hasta, el bloqueo sigue vigente.
        bloqueo_vigente = models.Q(estado="bloqueado") & (
            models.Q(bloqueo_hasta__isnull=True) | models.Q(bloqueo_hasta__gt=ahora)
        )
        bloqueo_vencido = models.Q(estado="bloqueado", bloqueo_hasta__lte=ahora)
        cotizada_vigente = (models.Q(estado="cotizado") | bloqueo_vencido) & oferta_vigente
        return self.filter(
            models.Q(fecha_evento__gte=hoy)
            & (models.Q(estado="confirmado") | bloqueo_vigente | cotizada_vigente)
        )

    def con_estado_efectivo(self, estado, ahora=None):
        """Filtra por el estado que ve el API: un bloqueo vencido cuenta como cotizado (SGDE-118)."""
        ahora = ahora or timezone.now()
        vencido = models.Q(estado="bloqueado", bloqueo_hasta__lte=ahora)
        if estado == "cotizado":
            return self.filter(models.Q(estado="cotizado") | vencido)
        if estado == "bloqueado":
            return self.filter(estado="bloqueado").exclude(vencido)
        return self.filter(estado=estado)


class Cotizacion(models.Model):
    ESTADO_CHOICES = [
        ("cotizado", "Cotizado"),
        ("bloqueado", "Bloqueado"),
        ("confirmado", "Confirmado"),
        ("cancelado", "Cancelado"),
    ]

    sitio = models.ForeignKey(Sitio, on_delete=models.PROTECT, related_name="cotizaciones")
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="cotizaciones")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cotizaciones")
    salon = models.ForeignKey(Salon, on_delete=models.PROTECT, related_name="cotizaciones")
    montaje = models.ForeignKey(Montaje, on_delete=models.PROTECT, related_name="cotizaciones")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="cotizado", db_index=True)
    fecha_evento = models.DateField(db_index=True)
    validez_oferta = models.DateField(null=True, blank=True)
    cantidad_personas = models.PositiveIntegerField()
    bloqueo_hasta = models.DateTimeField(null=True, blank=True)
    garantia_tipo = models.CharField(max_length=30, blank=True)
    garantia_monto = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    garantia_registrada_en = models.DateTimeField(null=True, blank=True)
    garantia_registrada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="garantias_registradas", null=True, blank=True
    )
    penalizacion_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    motivo_cancelacion = models.TextField(blank=True)
    # Los llena la cancelación (SGDE-61), junto con penalizacion_pct y motivo_cancelacion.
    cancelado_en = models.DateTimeField(null=True, blank=True)
    cancelado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="cancelaciones_registradas", null=True, blank=True
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    objects = CotizacionQuerySet.as_manager()

    class Meta:
        constraints = [
            # Evita sobreventa: no puede haber 2 cotizaciones CONFIRMADAS
            # para el mismo salón en la misma fecha.
            models.UniqueConstraint(
                fields=["salon", "fecha_evento"],
                condition=models.Q(estado="confirmado"),
                name="uq_salon_fecha_confirmado",
            )
        ]

    def __str__(self):
        return f"Cotización {self.id} - {self.cliente.nombre}"

    @property
    def bloqueo_vencido(self):
        # SGDE-118: bloqueada, pero su bloqueo_hasta ya pasó y aún no se liberó en la base.
        return (
            self.estado == "bloqueado"
            and self.bloqueo_hasta is not None
            and self.bloqueo_hasta <= timezone.now()
        )

    @property
    def vencida(self):
        # Se calcula al leer (no se guarda): está cotizada (o su bloqueo ya venció) y pasó su vigencia.
        return (
            (self.estado == "cotizado" or self.bloqueo_vencido)
            and self.validez_oferta is not None
            and self.validez_oferta < timezone.localdate()
        )


class CotizacionItem(models.Model):
    cotizacion = models.ForeignKey(Cotizacion, on_delete=models.CASCADE, related_name="items")
    concepto = models.ForeignKey(Concepto, on_delete=models.PROTECT, related_name="items")
    cantidad = models.PositiveIntegerField(default=1)
    # Copias del concepto al momento de cotizar: si luego cambia el concepto,
    # la cotización no cambia.
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    impuesto_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.concepto.nombre} x{self.cantidad}"

class MovimientoCotizacion(models.Model):
    """Quién hizo cada cambio de una cotización y cuándo (SGDE-62).

    Lo registra cada acción del API dentro de su misma transacción. usuario null
    significa que lo hizo el sistema (por ejemplo, la liberación de un bloqueo vencido).
    Lo que se cambie a mano en /admin/ no deja movimiento: queda en el LogEntry (RNF-03).
    """

    TIPO_CHOICES = [
        ("creada", "Creada"),
        ("vigencia", "Vigencia cambiada"),
        ("bloqueada", "Bloqueada"),
        ("liberada", "Liberada"),
        ("confirmada", "Confirmada"),
        ("cancelada", "Cancelada"),
        ("editada", "Editada"),
        ("anulada", "Anulada"),
    ]

    # CASCADE: el historial es parte de la cotización (el API no las borra).
    cotizacion = models.ForeignKey(Cotizacion, on_delete=models.CASCADE, related_name="movimientos")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="movimientos_cotizacion", null=True, blank=True
    )
    fecha = models.DateTimeField(auto_now_add=True, db_index=True)
    detalle = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["fecha", "id"]

    def __str__(self):
        return f"{self.get_tipo_display()} - cotización {self.cotizacion_id}"

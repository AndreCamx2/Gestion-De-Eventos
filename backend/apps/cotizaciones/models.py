from django.db import models
from django.conf import settings
from apps.sitios.models import Sitio
from apps.clientes.models import Cliente
from apps.salones.models import Salon, Montaje
from apps.catalogo.models import Concepto


class Cotizacion(models.Model):
    ESTADO_CHOICES = [
        ("cotizado", "Cotizado"),
        ("bloqueado", "Bloqueado"),
        ("confirmado", "Confirmado"),
        ("cancelado", "Cancelado"),
    ]

    sitio = models.ForeignKey(Sitio, on_delete=models.CASCADE, related_name="cotizaciones")
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="cotizaciones")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cotizaciones")
    salon = models.ForeignKey(Salon, on_delete=models.PROTECT, related_name="cotizaciones")
    montaje = models.ForeignKey(Montaje, on_delete=models.PROTECT, related_name="cotizaciones")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="cotizado")
    fecha_evento = models.DateField()
    validez_oferta = models.DateField(null=True, blank=True)
    cantidad_personas = models.PositiveIntegerField()
    bloqueo_hasta = models.DateTimeField(null=True, blank=True)
    garantia_tipo = models.CharField(max_length=30, blank=True)
    garantia_monto = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    penalizacion_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    motivo_cancelacion = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

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


class CotizacionItem(models.Model):
    cotizacion = models.ForeignKey(Cotizacion, on_delete=models.CASCADE, related_name="items")
    concepto = models.ForeignKey(Concepto, on_delete=models.PROTECT, related_name="items")
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.concepto.nombre} x{self.cantidad}"
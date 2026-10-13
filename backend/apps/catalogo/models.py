from django.conf import settings
from django.db import models
from apps.sitios.models import Sitio


class Concepto(models.Model):
    sitio = models.ForeignKey(Sitio, on_delete=models.PROTECT, related_name="conceptos")
    nombre = models.CharField(max_length=120)
    precio = models.DecimalField(max_digits=12, decimal_places=2)
    impuesto_pct = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    activo = models.BooleanField(default=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["sitio", "nombre"], name="uq_sitio_concepto_nombre")
        ]

    def __str__(self):
        return f"{self.nombre} - {self.sitio.nombre}"


class HistorialPrecioConcepto(models.Model):
    concepto = models.ForeignKey(Concepto, on_delete=models.CASCADE, related_name="historial_precios")
    precio_anterior = models.DecimalField(max_digits=12, decimal_places=2)
    precio_nuevo = models.DecimalField(max_digits=12, decimal_places=2)
    modificado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cambios_precio_conceptos"
    )
    fecha_modificacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_modificacion", "-id"]

    def __str__(self):
        return f"{self.concepto_id}: {self.precio_anterior} -> {self.precio_nuevo}"
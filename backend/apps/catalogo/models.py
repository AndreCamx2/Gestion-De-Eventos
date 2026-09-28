from django.db import models
from apps.sitios.models import Sitio


class Concepto(models.Model):
    sitio = models.ForeignKey(Sitio, on_delete=models.CASCADE, related_name="conceptos")
    nombre = models.CharField(max_length=120)
    precio = models.DecimalField(max_digits=12, decimal_places=2)
    impuesto_pct = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} - {self.sitio.nombre}"
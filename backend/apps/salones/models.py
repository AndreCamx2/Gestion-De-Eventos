from django.db import models
from apps.sitios.models import Sitio


class Montaje(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField(blank=True)

    def __str__(self):
        return self.nombre


class Salon(models.Model):
    sitio = models.ForeignKey(Sitio, on_delete=models.CASCADE, related_name="salones")
    nombre = models.CharField(max_length=100)
    altura = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ancho = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    foto_url = models.URLField(blank=True)

    def __str__(self):
        return f"{self.nombre} ({self.sitio.nombre})"


class SalonMontaje(models.Model):
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE, related_name="montajes")
    montaje = models.ForeignKey(Montaje, on_delete=models.PROTECT, related_name="salones")
    aforo = models.PositiveIntegerField()
    foto_url = models.URLField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["salon", "montaje"], name="uq_salon_montaje")
        ]

    def __str__(self):
        return f"{self.salon.nombre} - {self.montaje.nombre} ({self.aforo} pax)"
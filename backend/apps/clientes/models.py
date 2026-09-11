from django.db import models
from apps.hoteles.models import Empresa


class Cliente(models.Model):
    NATURAL = "natural"
    JURIDICA = "juridica"
    TIPO_CHOICES = [
        (NATURAL, "Natural"),
        (JURIDICA, "Jurídica"),
    ]

    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    nombre = models.CharField(max_length=200)
    empresa = models.ForeignKey(
        Empresa, on_delete=models.PROTECT, related_name="clientes",
        null=True, blank=True
    )
    forma_pago = models.CharField(max_length=100, blank=True)
    observaciones_internas = models.TextField(blank=True)

    def __str__(self):
        return self.nombre
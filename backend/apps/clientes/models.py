from django.conf import settings
from django.db import models
from apps.sitios.models import Ciudad


class Empresa(models.Model):
    razon_social = models.CharField(max_length=150)
    identificacion = models.CharField(max_length=30, unique=True)
    contacto = models.CharField(max_length=120, blank=True)
    ciudad = models.ForeignKey(Ciudad, on_delete=models.PROTECT, related_name="empresas", null=True, blank=True)

    def __str__(self):
        return self.razon_social


class Cliente(models.Model):
    NATURAL = "natural"
    JURIDICA = "juridica"
    TIPO_CHOICES = [
        (NATURAL, "Natural"),
        (JURIDICA, "Jurídica"),
    ]

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="cliente", null=True, blank=True
    )
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    nombre = models.CharField(max_length=150)
    identificacion = models.CharField(max_length=30, unique=True, null=True, blank=True)
    empresa = models.ForeignKey(
        Empresa, on_delete=models.PROTECT, related_name="clientes",
        null=True, blank=True
    )
    forma_pago = models.CharField(max_length=50, blank=True)
    observaciones_internas = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre
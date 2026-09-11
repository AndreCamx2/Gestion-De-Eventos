from django.db import models


class Ciudad(models.Model):
    codigo = models.CharField(max_length=10, unique=True)
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre


class Empresa(models.Model):
    razon_social = models.CharField(max_length=200)
    identificacion = models.CharField(max_length=30, unique=True)
    contacto = models.CharField(max_length=150, blank=True)
    ciudad = models.ForeignKey(Ciudad, on_delete=models.PROTECT, related_name="empresas")

    def __str__(self):
        return self.razon_social
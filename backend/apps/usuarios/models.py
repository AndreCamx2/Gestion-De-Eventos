from django.contrib.auth.models import AbstractUser
from django.db import models
from apps.sitios.models import Sitio


class Rol(models.Model):
    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField(blank=True)

    def __str__(self):
        return self.nombre


class Usuario(AbstractUser):
    rol = models.ForeignKey(Rol, on_delete=models.PROTECT, related_name="usuarios")
    sitios = models.ManyToManyField(Sitio, blank=True, related_name="administradores")

    def __str__(self):
        return f"{self.username} ({self.rol})"
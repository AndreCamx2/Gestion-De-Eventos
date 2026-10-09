from django.contrib.auth.models import AbstractUser
from django.db import models, transaction
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

    def set_activo(self, activo):
        """Activa o desactiva al usuario y a su Cliente vinculado (si lo tiene).

        Es el espejo de Cliente.set_activo. Cada método guarda su propio estado
        primero y solo llama al otro si el estado del otro todavía es distinto;
        así no hay recursión infinita (la segunda llamada ya encuentra todo igual).
        """
        with transaction.atomic():
            self.is_active = activo
            self.save(update_fields=["is_active"])
            # `cliente` es la relación inversa; si no hay Cliente, getattr devuelve None.
            cliente = getattr(self, "cliente", None)
            if cliente is not None and cliente.activo != activo:
                cliente.set_activo(activo)

    def __str__(self):
        return f"{self.username} ({self.rol})"
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models, transaction
from apps.sitios.models import Sitio


class Rol(models.Model):
    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField(blank=True)

    def __str__(self):
        return self.nombre


class UsuarioManager(UserManager):
    def get_by_natural_key(self, username):
        # El login no distingue mayúsculas: "Ana@Correo.com" entra como "ana@correo.com".
        # Si dos usuarios viejos solo se diferencian en eso, se exige el exacto.
        try:
            return self.get(username=username)
        except self.model.DoesNotExist:
            parecidos = list(self.filter(username__iexact=username)[:2])
            if len(parecidos) == 1:
                return parecidos[0]
            raise


class Usuario(AbstractUser):
    objects = UsuarioManager()

    rol = models.ForeignKey(Rol, on_delete=models.PROTECT, related_name="usuarios")
    sitios = models.ManyToManyField(Sitio, blank=True, related_name="administradores")

    def set_activo(self, activo):
        with transaction.atomic():
            self.is_active = activo
            self.save(update_fields=["is_active"])
            cliente = getattr(self, "cliente", None)
            if cliente is not None and cliente.activo != activo:
                cliente.set_activo(activo)

    def __str__(self):
        return f"{self.username} ({self.rol})"
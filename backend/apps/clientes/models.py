from django.conf import settings
from django.db import models, transaction
from apps.sitios.models import Ciudad


class Empresa(models.Model):
    razon_social = models.CharField(max_length=150, db_index=True)
    identificacion = models.CharField(max_length=30, unique=True, db_index=True)
    contacto = models.CharField(max_length=120, blank=True)
    correo = models.EmailField(blank=True)
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
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="cliente", null=True, blank=True
    )
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    nombre = models.CharField(max_length=150, db_index=True)
    identificacion = models.CharField(max_length=30, unique=True, null=True, blank=True, db_index=True)
    telefono = models.CharField(max_length=20, blank=True)
    correo = models.EmailField(blank=True, db_index=True)
    empresa = models.ForeignKey(
        Empresa, on_delete=models.PROTECT, related_name="clientes",
        null=True, blank=True
    )
    forma_pago = models.CharField(max_length=50, blank=True)
    observaciones_internas = models.TextField(blank=True)
    # Borrado lógico: un cliente con cotizaciones no se puede borrar (PROTECT)
    # y en un sistema comercial no se pierde historia.
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    def set_activo(self, activo):
        """Activa o desactiva al cliente y a su Usuario vinculado.

        Desactivar el Usuario revoca su acceso (login); sin eso, "borrar" un
        cliente auto-registrado no le quitaría la entrada al sistema.
        """
        with transaction.atomic():
            self.activo = activo
            self.save(update_fields=["activo"])
            if self.usuario_id:
                self.usuario.is_active = activo
                self.usuario.save(update_fields=["is_active"])

    def __str__(self):
        return self.nombre
from django.conf import settings
from django.core.exceptions import ValidationError
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
    MSG_JURIDICO_CON_IDENTIFICACION = (
        "Un cliente jurídico no lleva identificación: el NIT es el de su empresa."
    )

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

    class Meta:
        constraints = [
            # SGDE-91: el NIT de un jurídico vive en su Empresa. La base de datos lo
            # garantiza aunque se guarde desde el admin, el shell o código futuro.
            models.CheckConstraint(
                condition=models.Q(tipo="natural") | models.Q(identificacion__isnull=True),
                name="cliente_juridico_sin_identificacion",
            )
        ]

    def clean(self):
        # Lo usa el admin (full_clean): el error sale bajo el campo, no como el
        # IntegrityError del constraint.
        if self.tipo == self.JURIDICA and self.identificacion:
            raise ValidationError({"identificacion": self.MSG_JURIDICO_CON_IDENTIFICACION})

    def set_activo(self, activo):
        """Activa o desactiva al cliente y a su Usuario vinculado.

        Desactivar el Usuario revoca su acceso (login); sin eso, "borrar" un
        cliente auto-registrado no le quitaría la entrada al sistema.

        Es el espejo de Usuario.set_activo: cada uno guarda su estado y solo llama
        al otro si el estado del otro todavía es distinto (sin recursión infinita).
        """
        with transaction.atomic():
            self.activo = activo
            self.save(update_fields=["activo"])
            if self.usuario_id and self.usuario.is_active != activo:
                self.usuario.set_activo(activo)

    def __str__(self):
        return self.nombre
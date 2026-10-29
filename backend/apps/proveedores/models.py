from django.conf import settings
from django.db import models


class Proveedor(models.Model):
    nombre = models.CharField(max_length=150, db_index=True)
    identificacion = models.CharField(max_length=30, blank=True, db_index=True)
    contacto = models.CharField(max_length=120, blank=True)
    # Usuario con rol "proveedor" que administra este stock desde "Mi stock" (SGDE-30).
    # Opcional: el administrador también puede llevar el stock por él.
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="proveedor",
    )

    def __str__(self):
        return self.nombre


class StockElemento(models.Model):
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name="stock")
    nombre_elemento = models.CharField(max_length=120)
    cantidad = models.PositiveIntegerField(default=0)
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["proveedor", "nombre_elemento"], name="uq_proveedor_elemento")
        ]

    def __str__(self):
        return f"{self.nombre_elemento} - {self.proveedor.nombre}"

class HistorialStockElemento(models.Model):
    """Un cambio de cantidad o valor de un elemento de stock (SGDE-134).

    Guarda los dos campos antes y después, aunque solo cambie uno.
    """

    elemento = models.ForeignKey(StockElemento, on_delete=models.CASCADE, related_name="historial")
    cantidad_anterior = models.PositiveIntegerField()
    cantidad_nueva = models.PositiveIntegerField()
    valor_anterior = models.DecimalField(max_digits=12, decimal_places=2)
    valor_nuevo = models.DecimalField(max_digits=12, decimal_places=2)
    modificado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cambios_stock"
    )
    fecha_modificacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_modificacion", "-id"]

    def __str__(self):
        return (
            f"{self.elemento_id}: {self.cantidad_anterior} x {self.valor_anterior}"
            f" -> {self.cantidad_nueva} x {self.valor_nuevo}"
        )

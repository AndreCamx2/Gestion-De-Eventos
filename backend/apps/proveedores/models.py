from django.db import models


class Proveedor(models.Model):
    nombre = models.CharField(max_length=150, db_index=True)
    identificacion = models.CharField(max_length=30, blank=True, db_index=True)
    contacto = models.CharField(max_length=120, blank=True)

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
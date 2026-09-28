from django.db import models


class Ciudad(models.Model):
    codigo = models.CharField(max_length=10, unique=True)
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre


class Sitio(models.Model):
    nombre = models.CharField(max_length=150)
    ciudad = models.ForeignKey(Ciudad, on_delete=models.PROTECT, related_name="sitios")
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre
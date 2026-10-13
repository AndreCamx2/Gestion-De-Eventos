from rest_framework import serializers
from apps.cotizaciones.models import Cotizacion


class BloquearSalonSerializer(serializers.Serializer):
    """Entrada: qué cotización se bloquea y hasta cuándo."""
    cotizacion = serializers.PrimaryKeyRelatedField(queryset=Cotizacion.objects.all())
    bloqueo_hasta = serializers.DateTimeField()


class BloqueoSerializer(serializers.ModelSerializer):
    """Salida: el bloqueo tal como queda guardado en la cotización."""
    cotizacion = serializers.IntegerField(source="id", read_only=True)
    salon_nombre = serializers.CharField(source="salon.nombre", read_only=True)

    class Meta:
        model = Cotizacion
        fields = ["cotizacion", "salon", "salon_nombre", "fecha_evento", "estado", "bloqueo_hasta"]
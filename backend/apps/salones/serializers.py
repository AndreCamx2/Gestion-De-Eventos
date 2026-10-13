from django.db.models import Max
from rest_framework import serializers
from apps.cotizaciones.models import Cotizacion
from apps.sitios.acceso import CampoDeSitio
from apps.sitios.models import Sitio
from .models import Salon, Montaje, SalonMontaje


def no_cambia(serializer, campo, valor, mensaje):
    """Al editar, `campo` solo acepta el valor que ya tiene: si cambia, 400 (SGDE-88)."""
    if serializer.instance is not None and valor != getattr(serializer.instance, campo):
        raise serializers.ValidationError(mensaje)
    return valor


class SalonSerializer(serializers.ModelSerializer):
    # Solo se puede crear en un sitio propio: uno ajeno da 400 (SGDE-90).
    sitio = CampoDeSitio(queryset=Sitio.objects.all(), campo_sitio="id")

    class Meta:
        model = Salon
        fields = ["id", "sitio", "nombre", "altura", "ancho", "foto_url", "activo"]

    def validate_sitio(self, value):
        # Sus cotizaciones, conceptos y montajes son de ese sitio: moverlo los dejaría cruzados.
        return no_cambia(self, "sitio", value, "El sitio de un salón no se puede cambiar.")


class MontajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Montaje
        fields = ["id", "codigo", "nombre", "descripcion"]


class SalonMontajeSerializer(serializers.ModelSerializer):
    # El salón debe ser de un sitio propio; el montaje es un catálogo compartido.
    salon = CampoDeSitio(queryset=Salon.objects.all(), campo_sitio="sitio")

    class Meta:
        model = SalonMontaje
        fields = ["id", "salon", "montaje", "aforo", "foto_url"]

    def validate_salon(self, value):
        return no_cambia(
            self, "salon", value, "El salón no se puede cambiar: quita este montaje y habilítalo en el otro salón."
        )

    def validate_montaje(self, value):
        return no_cambia(
            self, "montaje", value, "El montaje no se puede cambiar: quítalo y habilita el nuevo montaje."
        )

    def validate_aforo(self, value):
        # Al editar, el aforo no puede quedar por debajo de una cotización activa con
        # este salón y montaje (definición en CotizacionQuerySet.activas).
        if self.instance is None:
            return value
        maximo = (
            Cotizacion.objects.activas()
            .filter(salon=self.instance.salon_id, montaje=self.instance.montaje_id)
            .aggregate(maximo=Max("cantidad_personas"))["maximo"]
        )
        if maximo is not None and value < maximo:
            raise serializers.ValidationError(
                f"Hay cotizaciones activas de hasta {maximo} personas en este montaje: "
                f"el aforo no puede ser menor."
            )
        return value

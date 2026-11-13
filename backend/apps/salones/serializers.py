from decimal import Decimal

from django.db.models import Max
from rest_framework import serializers
from apps.cotizaciones.models import Cotizacion
from apps.sitios.acceso import CampoDeSitio
from apps.sitios.models import Sitio
from .models import Salon, Montaje, SalonMontaje


AFORO_MAXIMO = 100_000


def no_cambia(serializer, campo, valor, mensaje):
    """Al editar, `campo` solo acepta el valor que ya tiene: si cambia, 400 (SGDE-88)."""
    if serializer.instance is not None and valor != getattr(serializer.instance, campo):
        raise serializers.ValidationError(mensaje)
    return valor


class SalonSerializer(serializers.ModelSerializer):
    sitio = CampoDeSitio(queryset=Sitio.objects.all(), campo_sitio="id")
    sitio_nombre = serializers.CharField(source="sitio.nombre", read_only=True)

    class Meta:
        model = Salon
        fields = ["id", "sitio", "sitio_nombre", "nombre", "altura", "ancho", "foto_url", "activo"]
        extra_kwargs = {
            campo: {"min_value": Decimal("0.01"), "error_messages": {"min_value": "Debe ser mayor que cero."}}
            for campo in ("altura", "ancho")
        }

    def validate(self, attrs):
        sitio = attrs.get("sitio", getattr(self.instance, "sitio", None))
        nombre = attrs.get("nombre")
        if sitio is not None and nombre:
            repetido = Salon.objects.filter(sitio=sitio, nombre__iexact=nombre)
            if self.instance is not None:
                repetido = repetido.exclude(pk=self.instance.pk)
            if repetido.exists():
                raise serializers.ValidationError({"nombre": ["Ya hay un salón con este nombre en el venue."]})
        return attrs

    def validate_sitio(self, value):
        # Sus cotizaciones, conceptos y montajes son de ese sitio: moverlo los dejaría cruzados.
        return no_cambia(self, "sitio", value, "El venue de un salón no se puede cambiar.")


class MontajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Montaje
        fields = ["id", "codigo", "nombre", "descripcion"]


class SalonMontajeSerializer(serializers.ModelSerializer):
    salon = CampoDeSitio(queryset=Salon.objects.all(), campo_sitio="sitio")

    class Meta:
        model = SalonMontaje
        fields = ["id", "salon", "montaje", "aforo", "foto_url"]
        extra_kwargs = {
            "aforo": {
                "min_value": 1, "max_value": AFORO_MAXIMO,
                "error_messages": {
                    "min_value": "El aforo debe ser de al menos 1 persona.",
                    "max_value": f"El aforo no puede pasar de {AFORO_MAXIMO:,} personas.".replace(",", "."),
                },
            },
        }

    def validate_salon(self, value):
        return no_cambia(
            self, "salon", value, "El salón no se puede cambiar: quita este montaje y habilítalo en el otro salón."
        )

    def validate_montaje(self, value):
        return no_cambia(
            self, "montaje", value, "El montaje no se puede cambiar: quítalo y habilita el nuevo montaje."
        )

    def validate_aforo(self, value):
        # No puede quedar por debajo de una cotización activa de este salón y montaje.
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

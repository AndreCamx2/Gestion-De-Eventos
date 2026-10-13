from rest_framework import generics, permissions
from .serializers import SalonSerializer, MontajeSerializer, SalonMontajeSerializer
from .models import Salon, Montaje, SalonMontaje
from apps.core.exceptions import Conflicto
from apps.cotizaciones.models import Cotizacion
from apps.sitios.acceso import filtrar_por_sitio
from apps.usuarios.permissions import EsAdministrador


def salones_del_usuario(usuario):
    return filtrar_por_sitio(Salon.objects.select_related("sitio"), usuario)


def salon_montajes_del_usuario(usuario):
    return filtrar_por_sitio(SalonMontaje.objects.select_related("salon", "montaje"), usuario, "salon__sitio")


class SalonListCreateView(generics.ListCreateAPIView):
    serializer_class = SalonSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return salones_del_usuario(self.request.user)


class SalonDetailView(generics.RetrieveUpdateAPIView):
    """Ver y editar un salón (nombre, medidas, foto). El sitio no cambia.

    Un salón de otro sitio da 404. Sin PUT ni DELETE: borrar un salón no está en
    la beta (el modelo no tiene borrado lógico).
    """

    serializer_class = SalonSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return salones_del_usuario(self.request.user)


class MontajeListCreateView(generics.ListCreateAPIView):
    # Catálogo compartido por todos los sitios (no tiene sitio).
    queryset = Montaje.objects.all()
    serializer_class = MontajeSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class SalonMontajeListCreateView(generics.ListCreateAPIView):
    serializer_class = SalonMontajeSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return salon_montajes_del_usuario(self.request.user)


def texto_cotizaciones_activas(cantidad):
    return "1 cotización activa" if cantidad == 1 else f"{cantidad} cotizaciones activas"


class SalonMontajeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Ver, editar (aforo y foto) o quitar un montaje habilitado en un salón.

    Quitarlo da 409 si hay cotizaciones activas con ese salón y montaje
    (CotizacionQuerySet.activas). Uno de otro sitio da 404.
    """

    serializer_class = SalonMontajeSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return salon_montajes_del_usuario(self.request.user)

    def perform_destroy(self, instance):
        activas = Cotizacion.objects.activas().filter(salon=instance.salon_id, montaje=instance.montaje_id).count()
        if activas:
            raise Conflicto(
                f"No se puede quitar el montaje: tiene {texto_cotizaciones_activas(activas)} "
                f"(cotizadas vigentes, bloqueadas o confirmadas, con evento de hoy en adelante)."
            )
        instance.delete()

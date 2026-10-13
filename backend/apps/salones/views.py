from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
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

    def bloquear_filas(self):
        """Bloquea el Salón y el montaje habilitado, en el mismo orden que la creación de
        cotizaciones (SGDE-100): así contar las activas y quitar o editar no se cruza
        con una cotización que se está creando. Va dentro de transaction.atomic()."""
        habilitado = self.get_object()
        Salon.objects.select_for_update().get(pk=habilitado.salon_id)
        return SalonMontaje.objects.select_for_update().get(pk=habilitado.pk)

    def update(self, request, *args, **kwargs):
        # validate_aforo cuenta las cotizaciones activas con las filas ya bloqueadas.
        with transaction.atomic():
            self.bloquear_filas()
            return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        with transaction.atomic():
            habilitado = self.bloquear_filas()
            activas = Cotizacion.objects.activas().filter(
                salon=habilitado.salon_id, montaje=habilitado.montaje_id
            ).count()
            if activas:
                raise Conflicto(
                    f"No se puede quitar el montaje: tiene {texto_cotizaciones_activas(activas)} "
                    f"(cotizadas vigentes, bloqueadas o confirmadas, con evento de hoy en adelante)."
                )
            habilitado.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

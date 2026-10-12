from rest_framework import generics, permissions
from .serializers import SalonSerializer, MontajeSerializer, SalonMontajeSerializer
from .models import Salon, Montaje, SalonMontaje
from apps.sitios.acceso import filtrar_por_sitio
from apps.usuarios.permissions import EsAdministrador


class SalonListCreateView(generics.ListCreateAPIView):
    serializer_class = SalonSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return filtrar_por_sitio(Salon.objects.select_related("sitio"), self.request.user)


class MontajeListCreateView(generics.ListCreateAPIView):
    # Catálogo compartido por todos los sitios (no tiene sitio).
    queryset = Montaje.objects.all()
    serializer_class = MontajeSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class SalonMontajeListCreateView(generics.ListCreateAPIView):
    serializer_class = SalonMontajeSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return filtrar_por_sitio(
            SalonMontaje.objects.select_related("salon", "montaje"), self.request.user, "salon__sitio"
        )

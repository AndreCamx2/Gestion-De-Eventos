from rest_framework import generics, permissions
from .serializers import SalonSerializer, MontajeSerializer, SalonMontajeSerializer
from .models import Salon, Montaje, SalonMontaje
from apps.usuarios.permissions import EsAdministrador


class SalonListCreateView(generics.ListCreateAPIView):
    queryset = Salon.objects.select_related("sitio")
    serializer_class = SalonSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class MontajeListCreateView(generics.ListCreateAPIView):
    queryset = Montaje.objects.all()
    serializer_class = MontajeSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class SalonMontajeListCreateView(generics.ListCreateAPIView):
    queryset = SalonMontaje.objects.select_related("salon", "montaje")
    serializer_class = SalonMontajeSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
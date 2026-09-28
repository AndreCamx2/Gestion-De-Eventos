from rest_framework import generics, permissions
from .serializers import SalonSerializer, MontajeSerializer, SalonMontajeSerializer
from .models import Salon, Montaje, SalonMontaje


class SalonListCreateView(generics.ListCreateAPIView):
    queryset = Salon.objects.all()
    serializer_class = SalonSerializer
    permission_classes = [permissions.IsAuthenticated]


class MontajeListCreateView(generics.ListCreateAPIView):
    queryset = Montaje.objects.all()
    serializer_class = MontajeSerializer
    permission_classes = [permissions.IsAuthenticated]


class SalonMontajeListCreateView(generics.ListCreateAPIView):
    queryset = SalonMontaje.objects.all()
    serializer_class = SalonMontajeSerializer
    permission_classes = [permissions.IsAuthenticated]
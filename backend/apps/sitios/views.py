from rest_framework import generics, permissions
from .models import Ciudad, Sitio
from .serializers import CiudadSerializer, SitioSerializer
from apps.usuarios.permissions import EsAdministrador


class SitioListCreateView(generics.ListCreateAPIView):
    queryset = Sitio.objects.select_related("ciudad")
    serializer_class = SitioSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class CiudadListView(generics.ListAPIView):
    queryset = Ciudad.objects.order_by("nombre")
    serializer_class = CiudadSerializer
    pagination_class = None  # catálogo corto: lista simple
    permission_classes = [permissions.IsAuthenticated]
from django.db import transaction
from rest_framework import generics, permissions
from .acceso import filtrar_por_sitio
from .models import Ciudad, Sitio
from .serializers import CiudadSerializer, SitioSerializer
from apps.usuarios.permissions import EsAdministrador


class SitioListCreateView(generics.ListCreateAPIView):
    """Lista los sitios del usuario (el superusuario, todos) y crea sitios nuevos."""

    serializer_class = SitioSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return filtrar_por_sitio(Sitio.objects.select_related("ciudad"), self.request.user, "id")

    @transaction.atomic
    def perform_create(self, serializer):
        # Quien crea el sitio lo administra: si no, desaparecería de su lista.
        sitio = serializer.save()
        self.request.user.sitios.add(sitio)


class CiudadListView(generics.ListAPIView):
    queryset = Ciudad.objects.order_by("nombre")
    serializer_class = CiudadSerializer
    pagination_class = None  # catálogo corto: lista simple
    permission_classes = [permissions.IsAuthenticated]

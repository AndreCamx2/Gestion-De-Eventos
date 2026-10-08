from rest_framework import generics, permissions
from .serializers import SitioSerializer
from .models import Sitio
from apps.usuarios.permissions import EsAdministrador


class SitioListCreateView(generics.ListCreateAPIView):
    queryset = Sitio.objects.select_related("ciudad")
    serializer_class = SitioSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

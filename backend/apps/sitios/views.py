from rest_framework import generics, permissions
from .serializers import SitioSerializer
from .models import Sitio


class SitioListCreateView(generics.ListCreateAPIView):
    queryset = Sitio.objects.all()
    serializer_class = SitioSerializer
    permission_classes = [permissions.IsAuthenticated]

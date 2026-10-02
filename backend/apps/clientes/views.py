from rest_framework import generics, permissions, filters
from .serializers import RegistroPublicoSerializer, ClienteAdminSerializer, EmpresaSerializer
from .models import Cliente, Empresa


class RegistroPublicoView(generics.CreateAPIView):
    serializer_class = RegistroPublicoSerializer
    permission_classes = [permissions.AllowAny]


class ClienteAdminListCreateView(generics.ListCreateAPIView):
    queryset = Cliente.objects.select_related("empresa").prefetch_related("cotizaciones")
    serializer_class = ClienteAdminSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre", "identificacion", "correo", "empresa__razon_social"]


class EmpresaListCreateView(generics.ListCreateAPIView):
    queryset = Empresa.objects.select_related("ciudad")
    serializer_class = EmpresaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["razon_social", "identificacion"]
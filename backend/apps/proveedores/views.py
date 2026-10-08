from rest_framework import generics, permissions
from .models import Proveedor, StockElemento
from .serializers import ProveedorSerializer, StockElementoSerializer


class ProveedorListCreateView(generics.ListCreateAPIView):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated]


class StockElementoListCreateView(generics.ListCreateAPIView):
    queryset = StockElemento.objects.all()
    serializer_class = StockElementoSerializer
    permission_classes = [permissions.IsAuthenticated]
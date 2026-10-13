from rest_framework import generics, permissions
from apps.usuarios.permissions import EsAdministrador
from .models import Proveedor, StockElemento
from .serializers import ProveedorSerializer, StockElementoSerializer


class ProveedorListCreateView(generics.ListCreateAPIView):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class StockElementoListCreateView(generics.ListCreateAPIView):
    queryset = StockElemento.objects.all()
    serializer_class = StockElementoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

class StockElementoDetailView(generics.RetrieveUpdateAPIView):
    """Ver y editar la cantidad y el valor de un elemento de stock (SGDE-98).

    Sin DELETE: para darlo por agotado se deja la cantidad en 0. Sin PUT.
    """

    queryset = StockElemento.objects.all()
    serializer_class = StockElementoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    http_method_names = ["get", "patch", "head", "options"]

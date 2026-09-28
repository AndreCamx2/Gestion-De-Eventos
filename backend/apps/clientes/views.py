from rest_framework import generics, permissions
from .serializers import RegistroPublicoSerializer, ClienteAdminSerializer
from .models import Cliente


class RegistroPublicoView(generics.CreateAPIView):
    serializer_class = RegistroPublicoSerializer
    permission_classes = [permissions.AllowAny]


class ClienteAdminListCreateView(generics.ListCreateAPIView):
    queryset = Cliente.objects.all()
    serializer_class = ClienteAdminSerializer
    permission_classes = [permissions.IsAuthenticated]
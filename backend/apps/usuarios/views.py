from rest_framework import generics, permissions
from .serializers import UsuarioRegistroSerializer, UsuarioMeSerializer


class RegistrarUsuarioView(generics.CreateAPIView):
    serializer_class = UsuarioRegistroSerializer
    permission_classes = [permissions.IsAuthenticated]


class MeView(generics.RetrieveAPIView):
    serializer_class = UsuarioMeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
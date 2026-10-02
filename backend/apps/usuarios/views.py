from rest_framework import generics, permissions
from .serializers import UsuarioRegistroSerializer, UsuarioMeSerializer


from .models import Usuario


class RegistrarUsuarioView(generics.CreateAPIView):
    serializer_class = UsuarioRegistroSerializer
    permission_classes = [permissions.IsAuthenticated]


class MeView(generics.RetrieveAPIView):
    serializer_class = UsuarioMeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return Usuario.objects.select_related("rol").prefetch_related("sitios").get(pk=self.request.user.pk)
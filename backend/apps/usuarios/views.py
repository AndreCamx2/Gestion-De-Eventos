from django.db import transaction
from rest_framework import filters, generics, permissions
from .serializers import UsuarioRegistroSerializer, UsuarioMeSerializer, UsuarioAdminSerializer
from .models import Usuario
from .permissions import EsAdministrador
from .services import validar_cambio_usuario


def _usuarios():
    return Usuario.objects.select_related("rol").prefetch_related("sitios").order_by("username")


class UsuarioListCreateView(generics.ListCreateAPIView):
    """GET: lista de usuarios. POST: crea un usuario interno (igual que /registro/).

    Filtros: ?search= (username, nombre, apellido, correo), ?rol=<codigo> e
    ?incluir_inactivos=true (por defecto solo activos).
    """
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name", "email"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UsuarioRegistroSerializer
        return UsuarioAdminSerializer

    def get_queryset(self):
        queryset = _usuarios()
        params = self.request.query_params
        if params.get("incluir_inactivos", "").lower() not in ("true", "1"):
            queryset = queryset.filter(is_active=True)
        rol = params.get("rol")
        if rol:
            queryset = queryset.filter(rol__codigo=rol)
        return queryset


class UsuarioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detalle de un usuario. Incluye inactivos para poder verlos y reactivarlos.

    DELETE es lógico: marca is_active=False (y da de baja a su Cliente, si lo tiene).
    """
    queryset = _usuarios()
    serializer_class = UsuarioAdminSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def perform_destroy(self, instance):
        with transaction.atomic():
            validar_cambio_usuario(
                instance, self.request.user, nuevo_activo=False, campo_baja="detail"
            )
            if instance.is_active:
                instance.set_activo(False)


class RegistrarUsuarioView(generics.CreateAPIView):
    serializer_class = UsuarioRegistroSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class MeView(generics.RetrieveAPIView):
    serializer_class = UsuarioMeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return Usuario.objects.select_related("rol").prefetch_related("sitios").get(pk=self.request.user.pk)

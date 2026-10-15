from django.db import transaction
from rest_framework import generics, permissions, filters
from apps.usuarios.correos import enviar_bienvenida
from .serializers import RegistroPublicoSerializer, ClienteAdminSerializer, EmpresaSerializer
from .models import Cliente, Empresa
from apps.usuarios.permissions import EsAdministrador


class RegistroPublicoView(generics.CreateAPIView):
    serializer_class = RegistroPublicoSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        cliente = serializer.save()
        transaction.on_commit(lambda: enviar_bienvenida(cliente))


# Clientes y empresas son COMPARTIDOS entre sitios (decisión de diseño, SGDE-90):
# un mismo cliente puede cotizar en varios sitios y el modelo no tiene sitio.
# Lo que sí es de cada sitio son sus cotizaciones: ClienteAdminSerializer solo
# muestra las de los sitios del usuario.
def _clientes():
    return Cliente.objects.select_related("empresa", "usuario").prefetch_related("cotizaciones")


class ClienteAdminListCreateView(generics.ListCreateAPIView):
    serializer_class = ClienteAdminSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    filter_backends = [filters.SearchFilter]
    search_fields = ["nombre", "identificacion", "correo", "empresa__razon_social"]

    def get_queryset(self):
        queryset = _clientes()
        incluir = self.request.query_params.get("incluir_inactivos", "").lower()
        if incluir not in ("true", "1"):
            queryset = queryset.filter(activo=True)
        return queryset


class ClienteAdminRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """Detalle de un cliente. Incluye inactivos para poder verlos y reactivarlos.

    DELETE es lógico: marca activo=False y desactiva su Usuario (no borra la fila).
    """
    queryset = _clientes()
    serializer_class = ClienteAdminSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def perform_destroy(self, instance):
        instance.set_activo(False)


class EmpresaListCreateView(generics.ListCreateAPIView):
    queryset = Empresa.objects.select_related("ciudad")
    serializer_class = EmpresaSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    filter_backends = [filters.SearchFilter]
    search_fields = ["razon_social", "identificacion"]
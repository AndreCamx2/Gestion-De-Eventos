from django.db.models import Prefetch
from rest_framework import generics, permissions, filters
from .serializers import RegistroPublicoSerializer, ClienteAdminSerializer, EmpresaSerializer
from .models import Cliente, Empresa
from apps.core.pagination import PaginaEstandar
from apps.cotizaciones.models import Cotizacion
from apps.sitios.acceso import filtrar_por_sitio
from apps.usuarios.permissions import EsAdministrador


class RegistroPublicoView(generics.CreateAPIView):
    serializer_class = RegistroPublicoSerializer
    permission_classes = [permissions.AllowAny]


# Clientes y empresas son COMPARTIDOS entre sitios (decisión de diseño, SGDE-90):
# un mismo cliente puede cotizar en varios sitios y el modelo no tiene sitio.
# Lo que sí es de cada sitio son sus cotizaciones: ClienteAdminSerializer solo
# muestra las de los sitios del usuario.
def _clientes(usuario=None):
    """Clientes con sus cotizaciones. Con `usuario`, el Prefetch trae solo las de
    sus sitios (SGDE-116): la base filtra y no se cargan filas de otros sitios.
    El serializer repite el filtro porque tras un PATCH DRF borra esta caché."""
    cotizaciones = Cotizacion.objects.all()
    if usuario is not None:
        cotizaciones = filtrar_por_sitio(cotizaciones, usuario)
    return (
        Cliente.objects.select_related("empresa", "usuario")
        .prefetch_related(Prefetch("cotizaciones", queryset=cotizaciones))
        .order_by("nombre", "id")
    )


class ClienteAdminListCreateView(generics.ListCreateAPIView):
    serializer_class = ClienteAdminSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    filter_backends = [filters.SearchFilter]
    pagination_class = PaginaEstandar
    search_fields = ["nombre", "identificacion", "correo", "empresa__razon_social"]

    def get_queryset(self):
        queryset = _clientes(self.request.user)
        incluir = self.request.query_params.get("incluir_inactivos", "").lower()
        if incluir not in ("true", "1"):
            queryset = queryset.filter(activo=True)
        return queryset


class ClienteAdminRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """Detalle de un cliente. Incluye inactivos para poder verlos y reactivarlos.

    DELETE es lógico: marca activo=False y desactiva su Usuario (no borra la fila).
    """
    serializer_class = ClienteAdminSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return _clientes(self.request.user)

    def perform_destroy(self, instance):
        instance.set_activo(False)


class EmpresaListCreateView(generics.ListCreateAPIView):
    queryset = Empresa.objects.select_related("ciudad")
    serializer_class = EmpresaSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    filter_backends = [filters.SearchFilter]
    search_fields = ["razon_social", "identificacion"]
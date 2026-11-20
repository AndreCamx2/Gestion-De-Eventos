from django.db.models import Prefetch
from django.db import transaction
from rest_framework import generics, permissions, filters
from apps.usuarios.correos import en_segundo_plano, enviar_bienvenida
from apps.usuarios.limites import ConLimiteDeIntentos
from .serializers import RegistroPublicoSerializer, ClienteAdminSerializer, EmpresaSerializer
from .models import Cliente, Empresa
from apps.core.pagination import PaginaEstandar
from apps.cotizaciones.models import Cotizacion
from apps.sitios.acceso import filtrar_por_sitio
from apps.usuarios.permissions import EsAdministrador


class RegistroPublicoView(ConLimiteDeIntentos, generics.CreateAPIView):
    serializer_class = RegistroPublicoSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "registro"

    def perform_create(self, serializer):
        cliente = serializer.save()
        # Fuera de la petición: un SMTP lento no demora el registro.
        transaction.on_commit(lambda: en_segundo_plano(enviar_bienvenida, cliente))


# Clientes y empresas son compartidos: un cliente puede cotizar en varios sitios.
def _clientes(usuario=None):
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
from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.usuarios.views import RegistrarUsuarioView, MeView, UsuarioListCreateView, UsuarioDetailView
from apps.sitios.views import SitioListCreateView
from apps.salones.views import SalonListCreateView, MontajeListCreateView, SalonMontajeListCreateView
from apps.catalogo.views import (
    ConceptoListCreateView, ConceptoRetrieveUpdateView, ConceptoHistorialListView,
)
from apps.proveedores.views import ProveedorListCreateView, StockElementoListCreateView
from apps.clientes.views import (
    RegistroPublicoView, ClienteAdminListCreateView, ClienteAdminRetrieveUpdateDestroyView, EmpresaListCreateView,
)
from apps.cotizaciones.views import (
    CotizacionCalendarioView, CotizacionListCreateView, CotizacionDetailView, CotizacionAceptacionView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/registro/', RegistroPublicoView.as_view(), name='registro_publico'),
    path('api/usuarios/registro/', RegistrarUsuarioView.as_view(), name='usuario_registro'),
    path('api/usuarios/me/', MeView.as_view(), name='usuario_me'),
    path('api/usuarios/', UsuarioListCreateView.as_view(), name='usuario_list_create'),
    path('api/usuarios/<int:pk>/', UsuarioDetailView.as_view(), name='usuario_detail'),
    path('api/sitios/', SitioListCreateView.as_view(), name='sitio_list_create'),
    path('api/clientes/', ClienteAdminListCreateView.as_view(), name='cliente_admin_list_create'),
    path('api/clientes/<int:pk>/', ClienteAdminRetrieveUpdateDestroyView.as_view(), name='cliente_admin_detail'),
    path('api/empresas/', EmpresaListCreateView.as_view(), name='empresa_list_create'),
    path('api/salones/', SalonListCreateView.as_view(), name='salon_list_create'),
    path('api/montajes/', MontajeListCreateView.as_view(), name='montaje_list_create'),
    path('api/salon-montajes/', SalonMontajeListCreateView.as_view(), name='salon_montaje_list_create'),
    path('api/conceptos/', ConceptoListCreateView.as_view(), name='concepto_list_create'),
    path('api/conceptos/<int:pk>/', ConceptoRetrieveUpdateView.as_view(), name='concepto_detail'),
    path('api/conceptos/<int:pk>/historial/', ConceptoHistorialListView.as_view(), name='concepto_historial'),
    path('api/proveedores/', ProveedorListCreateView.as_view(), name='proveedor_list_create'),
    path('api/stock/', StockElementoListCreateView.as_view(), name='stock_list_create'),
    path('api/cotizaciones/', CotizacionListCreateView.as_view(), name='cotizacion_list_create'),
    path('api/cotizaciones/<int:pk>/', CotizacionDetailView.as_view(), name='cotizacion_detail'),
    path('api/cotizaciones/<int:pk>/aceptacion/', CotizacionAceptacionView.as_view(), name='cotizacion_aceptacion'),
    path('api/calendario/', CotizacionCalendarioView.as_view(), name='calendario_cotizaciones'),
]
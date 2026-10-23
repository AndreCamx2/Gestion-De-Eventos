from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenBlacklistView
from apps.usuarios.views import (
    RegistrarUsuarioView, MeView, RolListView, UsuarioListCreateView, UsuarioDetailView,
    SolicitarRecuperacionView, RestablecerClaveView,
    LoginView, RenovarTokenView,
    MiPerfilView, CambiarCorreoView, CambiarContrasenaView,
)
from apps.sitios.views import SitioListCreateView, CiudadListView
from apps.salones.views import (
    SalonListCreateView, SalonDetailView, MontajeListCreateView, SalonMontajeListCreateView, SalonMontajeDetailView,
)
from apps.catalogo.views import (
    ConceptoListCreateView, ConceptoRetrieveUpdateView, ConceptoHistorialListView,
)
from apps.proveedores.views import (
    ProveedorListCreateView, ProveedorDetailView, StockElementoListCreateView, StockElementoDetailView,
    StockCompararView, MiStockListCreateView, MiStockDetailView,
)
from apps.clientes.views import (
    RegistroPublicoView, ClienteAdminListCreateView, ClienteAdminRetrieveUpdateDestroyView, EmpresaListCreateView,
)
from apps.cotizaciones.views import (
    CotizacionCalendarioView, CotizacionListCreateView, CotizacionDetailView, CotizacionAceptacionView,
    CotizacionBloqueoView, CotizacionCancelacionView, CotizacionMovimientosView,
    CotizacionAnulacionView, CotizacionEdicionView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', LoginView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', RenovarTokenView.as_view(), name='token_refresh'),
    # Logout (SGDE-92): {"refresh": ...} → lista negra. Público como /token/: sirve
    # aunque el access ya haya vencido.
    path('api/token/logout/', TokenBlacklistView.as_view(), name='token_logout'),
    path('api/registro/', RegistroPublicoView.as_view(), name='registro_publico'),
    path('api/clave/recuperar/', SolicitarRecuperacionView.as_view(), name='clave_recuperar'),
    path('api/clave/restablecer/', RestablecerClaveView.as_view(), name='clave_restablecer'),
    path('api/usuarios/registro/', RegistrarUsuarioView.as_view(), name='usuario_registro'),
    path('api/usuarios/me/', MeView.as_view(), name='usuario_me'),
    path('api/mi-perfil/', MiPerfilView.as_view(), name='mi_perfil'),
    path('api/mi-perfil/correo/', CambiarCorreoView.as_view(), name='mi_perfil_correo'),
    path('api/mi-perfil/contrasena/', CambiarContrasenaView.as_view(), name='mi_perfil_contrasena'),
    path('api/usuarios/', UsuarioListCreateView.as_view(), name='usuario_list_create'),
    path('api/usuarios/<int:pk>/', UsuarioDetailView.as_view(), name='usuario_detail'),
    path('api/roles/', RolListView.as_view(), name='rol_list'),
    path('api/ciudades/', CiudadListView.as_view(), name='ciudad_list'),
    path('api/sitios/', SitioListCreateView.as_view(), name='sitio_list_create'),
    path('api/clientes/', ClienteAdminListCreateView.as_view(), name='cliente_admin_list_create'),
    path('api/clientes/<int:pk>/', ClienteAdminRetrieveUpdateDestroyView.as_view(), name='cliente_admin_detail'),
    path('api/empresas/', EmpresaListCreateView.as_view(), name='empresa_list_create'),
    path('api/salones/', SalonListCreateView.as_view(), name='salon_list_create'),
    path('api/salones/<int:pk>/', SalonDetailView.as_view(), name='salon_detail'),
    path('api/montajes/', MontajeListCreateView.as_view(), name='montaje_list_create'),
    path('api/salon-montajes/', SalonMontajeListCreateView.as_view(), name='salon_montaje_list_create'),
    path('api/salon-montajes/<int:pk>/', SalonMontajeDetailView.as_view(), name='salon_montaje_detail'),
    path('api/conceptos/', ConceptoListCreateView.as_view(), name='concepto_list_create'),
    path('api/conceptos/<int:pk>/', ConceptoRetrieveUpdateView.as_view(), name='concepto_detail'),
    path('api/conceptos/<int:pk>/historial/', ConceptoHistorialListView.as_view(), name='concepto_historial'),
    path('api/proveedores/', ProveedorListCreateView.as_view(), name='proveedor_list_create'),
    path('api/proveedores/<int:pk>/', ProveedorDetailView.as_view(), name='proveedor_detail'),
    path('api/stock/', StockElementoListCreateView.as_view(), name='stock_list_create'),
    path('api/stock/comparar/', StockCompararView.as_view(), name='stock_comparar'),
    path('api/stock/<int:pk>/', StockElementoDetailView.as_view(), name='stock_detail'),
    path('api/mi-stock/', MiStockListCreateView.as_view(), name='mi_stock_list_create'),
    path('api/mi-stock/<int:pk>/', MiStockDetailView.as_view(), name='mi_stock_detail'),
    path('api/cotizaciones/', CotizacionListCreateView.as_view(), name='cotizacion_list_create'),
    path('api/cotizaciones/<int:pk>/', CotizacionDetailView.as_view(), name='cotizacion_detail'),
    path('api/cotizaciones/<int:pk>/aceptacion/', CotizacionAceptacionView.as_view(), name='cotizacion_aceptacion'),
    path('api/cotizaciones/<int:pk>/bloqueo/', CotizacionBloqueoView.as_view(), name='cotizacion_bloqueo'),
    path('api/cotizaciones/<int:pk>/cancelacion/', CotizacionCancelacionView.as_view(), name='cotizacion_cancelacion'),
    path('api/cotizaciones/<int:pk>/anulacion/', CotizacionAnulacionView.as_view(), name='cotizacion_anulacion'),
    path('api/cotizaciones/<int:pk>/edicion/', CotizacionEdicionView.as_view(), name='cotizacion_edicion'),
    path('api/cotizaciones/<int:pk>/movimientos/', CotizacionMovimientosView.as_view(), name='cotizacion_movimientos'),
    path('api/calendario/', CotizacionCalendarioView.as_view(), name='calendario_cotizaciones'),
]
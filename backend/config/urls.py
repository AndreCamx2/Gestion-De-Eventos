
from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.usuarios.views import RegistrarUsuarioView, MeView
from apps.sitios.views import SitioListCreateView
from apps.salones.views import SalonListCreateView, MontajeListCreateView, SalonMontajeListCreateView
from apps.clientes.views import RegistroPublicoView, ClienteAdminListCreateView, EmpresaListCreateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/registro/', RegistroPublicoView.as_view(), name='registro_publico'),
    path('api/usuarios/registro/', RegistrarUsuarioView.as_view(), name='usuario_registro'),
    path('api/usuarios/me/', MeView.as_view(), name='usuario_me'),
     path('api/sitios/', SitioListCreateView.as_view(), name='sitio_list_create'),
    path('api/clientes/', ClienteAdminListCreateView.as_view(), name='cliente_admin_list_create'),
    path('api/empresas/', EmpresaListCreateView.as_view(), name='empresa_list_create'),
    path('api/salones/', SalonListCreateView.as_view(), name='salon_list_create'),
    path('api/montajes/', MontajeListCreateView.as_view(), name='montaje_list_create'),
    path('api/salon-montajes/', SalonMontajeListCreateView.as_view(), name='salon_montaje_list_create'),

]
"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.usuarios.views import RegistrarUsuarioView, MeView
from apps.clientes.views import RegistroPublicoView
from apps.sitios.views import SitioListCreateView
from apps.salones.views import SalonListCreateView, MontajeListCreateView, SalonMontajeListCreateView

from apps.clientes.views import RegistroPublicoView, ClienteAdminListCreateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/registro/', RegistroPublicoView.as_view(), name='registro_publico'),
    path('api/usuarios/registro/', RegistrarUsuarioView.as_view(), name='usuario_registro'),
    path('api/usuarios/me/', MeView.as_view(), name='usuario_me'),
     path('api/sitios/', SitioListCreateView.as_view(), name='sitio_list_create'),
    path('api/clientes/', ClienteAdminListCreateView.as_view(), name='cliente_admin_list_create'),
    path('api/salones/', SalonListCreateView.as_view(), name='salon_list_create'),
    path('api/montajes/', MontajeListCreateView.as_view(), name='montaje_list_create'),
    path('api/salon-montajes/', SalonMontajeListCreateView.as_view(), name='salon_montaje_list_create'),

]

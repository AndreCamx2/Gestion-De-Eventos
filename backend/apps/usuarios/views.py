from django.db import transaction
from django.db.models import Q
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers import (
    RestablecerClaveSerializer, RolSerializer, SolicitarRecuperacionSerializer, UsuarioRegistroSerializer,
    UsuarioMeSerializer, UsuarioAdminSerializer,
)
from .correos import en_segundo_plano
from .limites import ConLimiteDeIntentos
from .recuperacion import cambiar_clave, solicitar_recuperacion, usuario_del_enlace
from .validators import validar_password_candidata
from .models import Rol, Usuario
from .perfil import (
    CambioContrasenaSerializer, CambioCorreoSerializer, actualizar_perfil, cambiar_correo, datos_perfil,
)
from .permissions import EsAdministrador, EsClienteOProveedor, TienePerfilVinculado
from .services import validar_cambio_usuario
from apps.core.pagination import PaginaEstandar


def _usuarios():
    return Usuario.objects.select_related("rol").prefetch_related("sitios").order_by("username")


def usuarios_visibles(actor):
    """El superusuario ve a todos. Un administrador ve a sí mismo, a quienes comparten un sitio
    con él y a los que no tienen sitios. Nunca a un superusuario.
    """
    queryset = _usuarios()
    if actor.is_superuser:
        return queryset
    return (
        queryset.filter(Q(pk=actor.pk) | Q(sitios__in=actor.sitios.all()) | Q(sitios__isnull=True))
        .exclude(is_superuser=True)
        .distinct()
    )


class UsuarioListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    filter_backends = [filters.SearchFilter]
    pagination_class = PaginaEstandar
    search_fields = ["username", "first_name", "last_name", "email"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UsuarioRegistroSerializer
        return UsuarioAdminSerializer

    def get_queryset(self):
        queryset = usuarios_visibles(self.request.user)
        params = self.request.query_params
        if params.get("incluir_inactivos", "").lower() not in ("true", "1"):
            queryset = queryset.filter(is_active=True)
        rol = params.get("rol")
        if rol:
            queryset = queryset.filter(rol__codigo=rol)
        return queryset


class UsuarioDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UsuarioAdminSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return usuarios_visibles(self.request.user)

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


class RolListView(generics.ListAPIView):
    queryset = Rol.objects.order_by("nombre")
    serializer_class = RolSerializer
    pagination_class = None
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class MeView(generics.RetrieveAPIView):
    serializer_class = UsuarioMeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return Usuario.objects.select_related("rol", "proveedor").prefetch_related("sitios").get(pk=self.request.user.pk)


MSG_SOLICITUD_RECIBIDA = "Si ese correo está registrado, te llegará un enlace para crear una contraseña nueva."
MSG_ENLACE_INVALIDO = "El enlace no es válido o ya venció. Pide uno nuevo."
MSG_CLAVE_ACTUALIZADA = "Tu contraseña quedó actualizada. Ya puedes iniciar sesión."


class SolicitarRecuperacionView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "recuperar_clave"

    def post(self, request):
        serializer = SolicitarRecuperacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Fuera de la petición: el tiempo de respuesta revelaría qué correos existen.
        en_segundo_plano(solicitar_recuperacion, serializer.validated_data["email"])
        return Response({"detail": MSG_SOLICITUD_RECIBIDA})


class RestablecerClaveView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "restablecer_clave"

    def post(self, request):
        serializer = RestablecerClaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data

        usuario = usuario_del_enlace(datos["uid"], datos["token"])
        if usuario is None:
            return Response({"detail": MSG_ENLACE_INVALIDO}, status=status.HTTP_400_BAD_REQUEST)

        validar_password_candidata(
            datos["password"], username=usuario.username, email=usuario.email,
            first_name=usuario.first_name, last_name=usuario.last_name,
        )
        cambiar_clave(usuario, datos["password"])
        return Response({"detail": MSG_CLAVE_ACTUALIZADA})


class LoginView(ConLimiteDeIntentos, TokenObtainPairView):
    throttle_scope = "login"


class RenovarTokenView(ConLimiteDeIntentos, TokenRefreshView):
    throttle_scope = "renovar_token"


def _usuario_con_perfil(usuario):
    return Usuario.objects.select_related("rol", "cliente__empresa", "proveedor").get(pk=usuario.pk)


class MiPerfilView(APIView):
    permission_classes = [permissions.IsAuthenticated, TienePerfilVinculado]

    def get(self, request):
        return Response(datos_perfil(_usuario_con_perfil(request.user)))

    def patch(self, request):
        usuario = _usuario_con_perfil(request.user)
        actualizar_perfil(usuario, request.data)
        return Response(datos_perfil(usuario))


class CambiarCorreoView(ConLimiteDeIntentos, APIView):
    permission_classes = [permissions.IsAuthenticated, EsClienteOProveedor]
    throttle_scope = "cambiar_credenciales"

    def post(self, request):
        usuario = _usuario_con_perfil(request.user)
        serializer = CambioCorreoSerializer(data=request.data, context={"usuario": usuario})
        serializer.is_valid(raise_exception=True)
        acceso = cambiar_correo(usuario, serializer.validated_data["correo_nuevo"])
        return Response({"detail": "Correo actualizado.", **acceso})


class CambiarContrasenaView(ConLimiteDeIntentos, APIView):
    permission_classes = [permissions.IsAuthenticated, EsClienteOProveedor]
    throttle_scope = "cambiar_credenciales"

    def post(self, request):
        usuario = _usuario_con_perfil(request.user)
        serializer = CambioContrasenaSerializer(data=request.data, context={"usuario": usuario})
        serializer.is_valid(raise_exception=True)
        cambiar_clave(usuario, serializer.validated_data["password_nueva"])
        refresh = RefreshToken.for_user(usuario)
        return Response({"detail": "Contraseña cambiada.", "access": str(refresh.access_token), "refresh": str(refresh)})

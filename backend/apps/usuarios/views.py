from django.db import transaction
from django.db.models import Q
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers import (
    RestablecerClaveSerializer, RolSerializer, SolicitarRecuperacionSerializer, UsuarioRegistroSerializer,
    UsuarioMeSerializer, UsuarioAdminSerializer,
)
from .limites import ConLimiteDeIntentos
from .recuperacion import cambiar_clave, solicitar_recuperacion, usuario_del_enlace
from .validators import validar_password_candidata
from .models import Rol, Usuario
from .permissions import EsAdministrador
from .services import validar_cambio_usuario


def _usuarios():
    return Usuario.objects.select_related("rol").prefetch_related("sitios").order_by("username")


def usuarios_visibles(actor):
    """Usuarios que puede ver y editar `actor` (SGDE-90).

    El superusuario ve a todos. Un administrador ve a sí mismo, a quienes comparten
    al menos un sitio con él y a los que no tienen sitios (proveedores, usuarios de
    clientes, recién creados), para poder gestionarlos. Nunca ve a un superusuario,
    tenga o no sitios: no puede verlo, editarlo ni darlo de baja. Cualquier otro da 404.
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
        queryset = usuarios_visibles(self.request.user)
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
    """Catálogo de roles para elegir el rol al crear o editar un usuario (SGDE-37).

    POST /api/usuarios/ y PATCH /api/usuarios/<id>/ reciben el rol como id.
    Solo lectura: los roles se administran en /admin/.
    """
    queryset = Rol.objects.order_by("nombre")
    serializer_class = RolSerializer
    pagination_class = None  # catálogo corto: lista simple
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
        solicitar_recuperacion(serializer.validated_data["email"])
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


# --- Login y renovación con límite de intentos por IP (SGDE-112) ---------------
# Mismas vistas de simplejwt (y los serializers de SIMPLE_JWT), con un tope por IP
# para frenar la fuerza bruta. Las tasas están en DEFAULT_THROTTLE_RATES (settings.py).

class LoginView(ConLimiteDeIntentos, TokenObtainPairView):
    """POST /api/token/ → {access, refresh}. Pasado el límite responde 429."""

    throttle_scope = "login"


class RenovarTokenView(ConLimiteDeIntentos, TokenRefreshView):
    """POST /api/token/refresh/ → {access, refresh}. Pasado el límite responde 429."""

    throttle_scope = "renovar_token"

from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from apps.sitios.acceso import CampoDeSitio
from apps.sitios.models import Sitio
from .models import Usuario, Rol
from .services import validar_cambio_usuario
from .validators import validar_password_candidata

MSG_ROL_CLIENTE_REGISTRO = "Los clientes se crean desde la pantalla de Clientes."


def campo_sitios():
    """Sitios asignables: solo los del administrador que hace la petición (SGDE-90).

    Sin esto, un administrador podría darse a sí mismo sitios ajenos y saltarse
    el filtro por sitio. Un sitio ajeno da 400.
    """
    return CampoDeSitio(many=True, required=False, queryset=Sitio.objects.all(), campo_sitio="id")


class UsuarioRegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    sitios = campo_sitios()

    class Meta:
        model = Usuario
        fields = ["id", "username", "email", "password", "rol", "sitios"]

    def validate_rol(self, rol):
        # Defensa en profundidad (SEG-004): aunque la vista ya exige administrador,
        # el rol solo lo puede fijar un administrador autenticado.
        request = self.context.get("request")
        usuario = getattr(request, "user", None)
        if not (usuario and usuario.is_authenticated and usuario.rol.codigo == "administrador"):
            raise PermissionDenied("Solo un administrador puede asignar el rol de un usuario.")
        # Los clientes se crean desde Clientes (o el registro público), que también
        # crea el registro Cliente vinculado; aquí quedaría un usuario sin Cliente.
        if rol.codigo == "cliente":
            raise serializers.ValidationError(MSG_ROL_CLIENTE_REGISTRO)
        return rol

    def validate(self, attrs):
        # Mismas reglas de AUTH_PASSWORD_VALIDATORS que el registro público (validators.py).
        validar_password_candidata(
            attrs["password"], username=attrs.get("username", ""), email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""), last_name=attrs.get("last_name", ""),
        )
        return attrs

    def create(self, validated_data):
        sitios = validated_data.pop("sitios", [])
        password = validated_data.pop("password")

        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        usuario.sitios.set(sitios)

        return usuario


class UsuarioAdminSerializer(serializers.ModelSerializer):
    """Lectura y edición de usuarios por un administrador.

    La lista de campos es explícita y NO incluye password, is_superuser, is_staff,
    groups ni user_permissions (SEG-001/004): enviarlos en el payload no tiene efecto.
    La contraseña no se cambia por aquí.
    """
    rol_codigo = serializers.CharField(source="rol.codigo", read_only=True)
    sitios = campo_sitios()

    class Meta:
        model = Usuario
        fields = ["id", "username", "first_name", "last_name", "email", "rol", "rol_codigo",
                  "sitios", "is_active", "last_login", "date_joined"]
        read_only_fields = ["last_login", "date_joined"]

    def update(self, instance, validated_data):
        actor = self.context["request"].user
        activo = validated_data.pop("is_active", None)
        if "sitios" in validated_data and not actor.is_superuser:
            # Los sitios que el actor no administra no se pueden ni ver ni quitar:
            # se conservan tal como estaban.
            ajenos = instance.sitios.exclude(pk__in=actor.sitios.all())
            validated_data["sitios"] = [*validated_data["sitios"], *ajenos]
        with transaction.atomic():
            validar_cambio_usuario(
                instance, actor, nuevo_rol=validated_data.get("rol"), nuevo_activo=activo
            )
            instance = super().update(instance, validated_data)
            # Solo si "is_active" venía en el payload; propaga al Cliente vinculado.
            if activo is not None and activo != instance.is_active:
                instance.set_activo(activo)
        return instance


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ["id", "codigo", "nombre"]


class UsuarioMeSerializer(serializers.ModelSerializer):
    rol = RolSerializer(read_only=True)
    sitios = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    # Proveedor vinculado (SGDE-30): {id, nombre} o null. "Mi stock" lo muestra de subtítulo.
    proveedor = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ["id", "username", "first_name", "email", "rol", "sitios", "proveedor"]

    def get_proveedor(self, usuario):
        proveedor = getattr(usuario, "proveedor", None)
        return {"id": proveedor.id, "nombre": proveedor.nombre} if proveedor else None


class SolicitarRecuperacionSerializer(serializers.Serializer):
    email = serializers.EmailField()


class RestablecerClaveSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)

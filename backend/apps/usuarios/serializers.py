from django.db import transaction
from django.db.models import Q
from rest_framework import serializers
from apps.clientes.validadores import validar_nombre
from rest_framework.exceptions import PermissionDenied
from apps.sitios.acceso import CampoDeSitio
from apps.sitios.models import Sitio
from .models import Usuario, Rol
from .services import validar_cambio_usuario
from .validators import validar_password_candidata

MSG_ROL_CLIENTE_REGISTRO = "Los clientes se crean desde la pantalla de Clientes."
MSG_USUARIO_REPETIDO = "Ya existe un usuario con este nombre."
MSG_CORREO_REPETIDO = "Ya existe un usuario con este correo."


class DatosDeUsuarioMixin:
    """Usuario y correo únicos sin distinguir mayúsculas; el correo se guarda en minúscula."""

    def _otros(self):
        otros = Usuario.objects.all()
        return otros.exclude(pk=self.instance.pk) if self.instance is not None else otros

    def validate_username(self, value):
        if self._otros().filter(Q(username__iexact=value) | Q(email__iexact=value)).exists():
            raise serializers.ValidationError(MSG_USUARIO_REPETIDO)
        return value

    def validate_email(self, value):
        correo = value.lower()
        if correo and self._otros().filter(Q(email__iexact=correo) | Q(username__iexact=correo)).exists():
            raise serializers.ValidationError(MSG_CORREO_REPETIDO)
        return correo

    def validate_first_name(self, value):
        return validar_nombre(value) if value.strip() else ""

    def validate_last_name(self, value):
        return validar_nombre(value) if value.strip() else ""


def campo_sitios():
    """Solo los sitios del administrador que hace la petición: si no, podría darse sitios ajenos."""
    return CampoDeSitio(many=True, required=False, queryset=Sitio.objects.all(), campo_sitio="id")


class UsuarioRegistroSerializer(DatosDeUsuarioMixin, serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, max_length=128, trim_whitespace=False)
    sitios = campo_sitios()

    class Meta:
        model = Usuario
        fields = ["id", "username", "email", "password", "rol", "sitios"]

    def validate_rol(self, rol):
        # La vista ya lo exige; aquí también, por si alguien reutiliza el serializer.
        request = self.context.get("request")
        usuario = getattr(request, "user", None)
        if not (usuario and usuario.is_authenticated and usuario.rol.codigo == "administrador"):
            raise PermissionDenied("Solo un administrador puede asignar el rol de un usuario.")
        # Desde aquí quedaría un usuario sin su Cliente.
        if rol.codigo == "cliente":
            raise serializers.ValidationError(MSG_ROL_CLIENTE_REGISTRO)
        return rol

    def validate(self, attrs):
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


class UsuarioAdminSerializer(DatosDeUsuarioMixin, serializers.ModelSerializer):
    """Sin password, is_superuser, is_staff, groups ni user_permissions: enviarlos no tiene efecto."""
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
            # Los sitios que el actor no administra se conservan.
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
    password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from .models import Usuario, Rol
from .services import validar_cambio_usuario

MSG_ROL_CLIENTE_REGISTRO = "Los clientes se crean desde la pantalla de Clientes."


class UsuarioRegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

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
        # Mismas reglas de AUTH_PASSWORD_VALIDATORS que usa el admin de Django.
        # Se pasa un usuario temporal para que valide la similitud con username/email.
        usuario = Usuario(username=attrs.get("username", ""), email=attrs.get("email", ""))
        try:
            validate_password(attrs["password"], user=usuario)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
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

    class Meta:
        model = Usuario
        fields = ["id", "username", "first_name", "last_name", "email", "rol", "rol_codigo",
                  "sitios", "is_active", "last_login", "date_joined"]
        read_only_fields = ["last_login", "date_joined"]

    def update(self, instance, validated_data):
        actor = self.context["request"].user
        activo = validated_data.pop("is_active", None)
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

    class Meta:
        model = Usuario
        fields = ["id", "username", "email", "rol", "sitios"]
from rest_framework import serializers
from .models import Usuario, Rol


class UsuarioRegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = ["id", "username", "email", "password", "rol", "sitios"]

    def create(self, validated_data):
        sitios = validated_data.pop("sitios", [])
        password = validated_data.pop("password")

        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        usuario.sitios.set(sitios)

        return usuario


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
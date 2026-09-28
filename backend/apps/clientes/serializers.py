from django.db import transaction
from rest_framework import serializers
from apps.usuarios.models import Usuario, Rol
from apps.sitios.models import Ciudad
from .models import Cliente, Empresa

class ClienteAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ["id", "tipo", "nombre", "identificacion", "empresa",
                  "forma_pago", "observaciones_internas", "creado_en"]
        read_only_fields = ["creado_en"]

    def validate(self, data):
        tipo = data.get("tipo")
        empresa = data.get("empresa")
        if tipo == Cliente.JURIDICA and not empresa:
            raise serializers.ValidationError(
                {"empresa": "Debes asociar una empresa existente si el cliente es jurídico."}
            )
        return data


class RegistroPublicoSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=Cliente.TIPO_CHOICES)
    nombre = serializers.CharField(max_length=150)
    identificacion = serializers.CharField(max_length=30)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField()
    ciudad = serializers.CharField(max_length=10)  # código, ej. "CTG"
    password = serializers.CharField(write_only=True, min_length=6)

    # Solo si tipo = "juridica"
    razon_social = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate(self, data):
        if data["tipo"] == Cliente.JURIDICA and not data.get("razon_social"):
            raise serializers.ValidationError(
                {"razon_social": "La razón social es obligatoria para clientes jurídicos."}
            )
        if Usuario.objects.filter(username=data["email"]).exists():
            raise serializers.ValidationError({"email": "Ya existe una cuenta con este correo."})
        return data

    @transaction.atomic
    def create(self, validated_data):
        ciudad = Ciudad.objects.get(codigo=validated_data["ciudad"])
        rol_cliente = Rol.objects.get(codigo="cliente")

        usuario = Usuario(username=validated_data["email"], email=validated_data["email"], rol=rol_cliente)
        usuario.set_password(validated_data["password"])
        usuario.save()

        empresa = None
        if validated_data["tipo"] == Cliente.JURIDICA:
            empresa = Empresa.objects.create(
                razon_social=validated_data["razon_social"],
                identificacion=validated_data["identificacion"],
                contacto=validated_data.get("telefono", ""),
                ciudad=ciudad,
            )

        cliente = Cliente.objects.create(
            usuario=usuario,
            tipo=validated_data["tipo"],
            nombre=validated_data["nombre"],
            identificacion=validated_data["identificacion"] if empresa is None else None,
            empresa=empresa,
        )

        return cliente

    def to_representation(self, instance):
        return {
            "id": instance.id,
            "nombre": instance.nombre,
            "tipo": instance.tipo,
            "email": instance.usuario.email,
            "mensaje": "Cuenta creada correctamente. Ya puedes iniciar sesión.",
        }
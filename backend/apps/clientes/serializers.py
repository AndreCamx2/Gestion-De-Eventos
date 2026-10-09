from django.db import transaction
from rest_framework import serializers
from apps.usuarios.models import Usuario, Rol
from apps.usuarios.validators import errores_password
from apps.sitios.models import Ciudad
from apps.cotizaciones.models import Cotizacion
from .models import Cliente, Empresa


class CotizacionResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cotizacion
        fields = ["id", "estado", "fecha_evento", "cantidad_personas", "creado_en"]


class ClienteAdminSerializer(serializers.ModelSerializer):
    cotizaciones = CotizacionResumenSerializer(many=True, read_only=True)

    class Meta:
        model = Cliente
        fields = ["id", "tipo", "nombre", "identificacion", "telefono", "correo", "empresa",
                  "forma_pago", "observaciones_internas", "activo", "creado_en", "cotizaciones"]
        read_only_fields = ["creado_en"]
        # La unicidad se valida en validate_identificacion, con un mensaje que
        # distingue al cliente inactivo (el validador automático diría solo "duplicado").
        extra_kwargs = {"identificacion": {"validators": []}}

    def validate_identificacion(self, value):
        if not value:
            return value
        existente = Cliente.objects.filter(identificacion=value)
        if self.instance:
            existente = existente.exclude(pk=self.instance.pk)
        existente = existente.first()
        if existente is None:
            return value
        if not existente.activo:
            raise serializers.ValidationError(
                f"Ya existe un cliente con esa identificación, pero está inactivo "
                f"(id {existente.id}). Puedes reactivarlo en lugar de crear uno nuevo."
            )
        raise serializers.ValidationError("Ya existe un cliente con esa identificación.")

    def update(self, instance, validated_data):
        activo = validated_data.pop("activo", None)
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            # Solo si "activo" venía en el payload: un PUT sin el campo no reactiva.
            if activo is not None and activo != instance.activo:
                instance.set_activo(activo)
        return instance

    def validate(self, data):
        # En PATCH/PUT parciales el payload puede no traer tipo o empresa:
        # se completan con lo guardado para que la regla también valga al editar.
        tipo = data.get("tipo", self.instance.tipo if self.instance else None)
        empresa = data.get("empresa", self.instance.empresa if self.instance else None)
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
    password = serializers.CharField(write_only=True, min_length=8)

    # Solo si tipo = "juridica"
    razon_social = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate(self, data):
        # Se juntan todos los errores en una sola respuesta 400, para que el usuario
        # corrija el formulario de una vez.
        errores = {}
        if data["tipo"] == Cliente.JURIDICA and not data.get("razon_social"):
            errores["razon_social"] = "La razón social es obligatoria para clientes jurídicos."
        if Usuario.objects.filter(username=data["email"]).exists():
            errores["email"] = "Ya existe una cuenta con este correo."
        mensajes = errores_password(
            data["password"], username=data["email"], email=data["email"], first_name=data["nombre"],
        )
        if mensajes:
            errores["password"] = mensajes
        if errores:
            raise serializers.ValidationError(errores)
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


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = ["id", "razon_social", "identificacion", "contacto", "correo", "ciudad"]
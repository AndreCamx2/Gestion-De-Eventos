from django.db import transaction
from django.db.models import Q
from rest_framework import serializers
from rest_framework.utils.serializer_helpers import ReturnDict
from apps.usuarios.models import Usuario, Rol
from apps.usuarios.validators import errores_password
from apps.sitios.acceso import sitios_del_usuario
from apps.sitios.models import Ciudad
from apps.cotizaciones.models import Cotizacion
from apps.cotizaciones.serializers import EstadoEfectivoMixin
from .models import Cliente, Empresa
from .validadores import (
    validar_cedula, validar_nit, validar_nombre, validar_razon_social, validar_telefono,
)


def nit_registrado(nit, excepto=None):
    numero = nit.split("-")[0]
    empresas = Empresa.objects.filter(Q(identificacion=numero) | Q(identificacion__startswith=f"{numero}-"))
    if excepto is not None:
        empresas = empresas.exclude(pk=excepto.pk)
    return empresas.exists()


class CotizacionResumenSerializer(EstadoEfectivoMixin, serializers.ModelSerializer):
    vencida = serializers.BooleanField(read_only=True)

    class Meta:
        model = Cotizacion
        fields = ["id", "estado", "vencida", "validez_oferta", "fecha_evento", "cantidad_personas", "creado_en"]


class ClienteAdminSerializer(serializers.ModelSerializer):
    # El cliente es compartido entre sitios; sus cotizaciones no.
    cotizaciones = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = ["id", "tipo", "nombre", "identificacion", "telefono", "correo", "empresa",
                  "forma_pago", "observaciones_internas", "activo", "creado_en", "cotizaciones"]
        read_only_fields = ["creado_en"]
        # validate_identificacion revisa la unicidad y avisa si el repetido está inactivo.
        extra_kwargs = {
            "identificacion": {"validators": []},
            "observaciones_internas": {"max_length": 2000},
        }

    def validate_nombre(self, value):
        return validar_nombre(value)

    def validate_telefono(self, value):
        return validar_telefono(value)

    def validate_correo(self, value):
        return value.lower()

    def _sitios_permitidos(self):
        """Ids de sitio visibles (None = todos). Se filtra en Python porque tras un PATCH DRF
        borra el prefetch y releería todo sin filtro.
        """
        if not hasattr(self, "_sitios_cache"):
            request = self.context.get("request")
            if request is None:
                self._sitios_cache = set()
            elif request.user.is_superuser:
                self._sitios_cache = None
            else:
                self._sitios_cache = set(sitios_del_usuario(request.user).values_list("id", flat=True))
        return self._sitios_cache

    def get_cotizaciones(self, cliente):
        permitidos = self._sitios_permitidos()
        cotizaciones = [
            c for c in cliente.cotizaciones.all() if permitidos is None or c.sitio_id in permitidos
        ]
        return CotizacionResumenSerializer(cotizaciones, many=True).data

    def _tipo_final(self):
        """Tipo con el que quedará el cliente. Sale de initial_data porque los validadores de
        campo corren antes que validate().
        """
        tipo = getattr(self, "initial_data", {}).get("tipo")
        if tipo is None and self.instance is not None:
            tipo = self.instance.tipo
        return tipo

    def validate_identificacion(self, value):
        if self._tipo_final() == Cliente.JURIDICA:
            if value:
                raise serializers.ValidationError(Cliente.MSG_JURIDICO_CON_IDENTIFICACION)
            return None
        # null y no "": dos "" chocarían con el unique.
        if not value:
            return None
        value = validar_cedula(value)
        existente = Cliente.objects.filter(identificacion=value)
        if self.instance:
            existente = existente.exclude(pk=self.instance.pk)
        existente = existente.first()
        if existente is None:
            return value
        if not existente.activo:
            self._cliente_inactivo = existente.id
            raise serializers.ValidationError(
                f"Ya existe un cliente con esa identificación, pero está inactivo "
                f"(id {existente.id}). Puedes reactivarlo en lugar de crear uno nuevo."
            )
        raise serializers.ValidationError("Ya existe un cliente con esa identificación.")

    @property
    def errors(self):
        errores = super().errors
        inactivo = getattr(self, "_cliente_inactivo", None)
        if inactivo is not None and "identificacion" in errores:
            return ReturnDict({**errores, "cliente_inactivo": inactivo}, serializer=self)
        return errores

    def is_valid(self, *, raise_exception=False):
        # ValidationError convierte todo en texto: el id se vuelve a poner como número.
        valido = super().is_valid(raise_exception=False)
        if not valido and raise_exception:
            error = serializers.ValidationError(self.errors)
            if "cliente_inactivo" in error.detail:
                error.detail["cliente_inactivo"] = self._cliente_inactivo
            raise error
        return valido

    def update(self, instance, validated_data):
        activo = validated_data.pop("activo", None)
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            # Solo si "activo" venía en el payload: un PUT sin el campo no reactiva.
            if activo is not None and activo != instance.activo:
                instance.set_activo(activo)
        return instance

    def validate(self, data):
        tipo = data.get("tipo", self.instance.tipo if self.instance else None)
        empresa = data.get("empresa", self.instance.empresa if self.instance else None)
        if tipo == Cliente.JURIDICA and not empresa:
            raise serializers.ValidationError(
                {"empresa": "Debes asociar una empresa existente si el cliente es jurídico."}
            )
        # Un jurídico no guarda identificación: si pasa de natural a jurídico, se borra.
        if (
            tipo == Cliente.JURIDICA
            and "identificacion" not in data
            and self.instance is not None
            and self.instance.identificacion is not None
        ):
            data["identificacion"] = None
        return data


MSG_IDENTIFICACION_REPETIDA = "Ya existe una cuenta con esta identificación."
MSG_NIT_REPETIDO = "Ya existe una empresa registrada con este NIT."


class RegistroPublicoSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=Cliente.TIPO_CHOICES)
    nombre = serializers.CharField(max_length=150)
    identificacion = serializers.CharField(max_length=30)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)
    # El correo es el usuario de acceso, y Usuario.username admite 150 caracteres.
    email = serializers.EmailField(max_length=150)
    ciudad = serializers.SlugRelatedField(
        slug_field="codigo", queryset=Ciudad.objects.all(),
        error_messages={"does_not_exist": "La ciudad no es válida.", "invalid": "La ciudad no es válida."},
    )
    password = serializers.CharField(write_only=True, min_length=8, max_length=128, trim_whitespace=False)

    razon_social = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_nombre(self, value):
        return validar_nombre(value)

    def validate_razon_social(self, value):
        return validar_razon_social(value) if value.strip() else ""

    def validate_identificacion(self, value):
        if self.initial_data.get("tipo") == Cliente.JURIDICA:
            return validar_nit(value)
        return validar_cedula(value)

    def validate_telefono(self, value):
        return validar_telefono(value)

    def validate_email(self, value):
        return value.lower()

    def validate(self, data):
        errores = {}
        if data["tipo"] == Cliente.JURIDICA and not data.get("razon_social"):
            errores["razon_social"] = "La razón social es obligatoria para clientes jurídicos."
        if Usuario.objects.filter(Q(username__iexact=data["email"]) | Q(email__iexact=data["email"])).exists():
            errores["email"] = "Ya existe una cuenta con este correo."
        if data["tipo"] == Cliente.JURIDICA:
            if nit_registrado(data["identificacion"]):
                errores["identificacion"] = MSG_NIT_REPETIDO
        elif Cliente.objects.filter(identificacion=data["identificacion"]).exists():
            errores["identificacion"] = MSG_IDENTIFICACION_REPETIDA
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
        ciudad = validated_data["ciudad"]
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
            telefono=validated_data.get("telefono", ""),
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
        # La unicidad se revisa con el NIT ya limpio: "900.123.456" es el mismo que "900123456".
        extra_kwargs = {"identificacion": {"validators": []}}

    def validate_razon_social(self, value):
        return validar_razon_social(value)

    def validate_identificacion(self, value):
        nit = validar_nit(value)
        if nit_registrado(nit, excepto=self.instance):
            raise serializers.ValidationError(MSG_NIT_REPETIDO)
        return nit

    def validate_correo(self, value):
        return value.lower()
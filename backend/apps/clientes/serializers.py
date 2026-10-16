from django.db import transaction
from rest_framework import serializers
from rest_framework.utils.serializer_helpers import ReturnDict
from apps.usuarios.models import Usuario, Rol
from apps.usuarios.validators import errores_password
from apps.sitios.acceso import sitios_del_usuario
from apps.sitios.models import Ciudad
from apps.cotizaciones.models import Cotizacion
from .models import Cliente, Empresa


class CotizacionResumenSerializer(serializers.ModelSerializer):
    # Historial del detalle del cliente. vencida usa la property del modelo y
    # validez_oferta le dice a la pantalla cuándo venció (SGDE-95).
    vencida = serializers.BooleanField(read_only=True)

    class Meta:
        model = Cotizacion
        fields = ["id", "estado", "vencida", "validez_oferta", "fecha_evento", "cantidad_personas", "creado_en"]


class ClienteAdminSerializer(serializers.ModelSerializer):
    # El cliente es compartido entre sitios, pero sus cotizaciones no: solo se
    # muestran las de los sitios del usuario (SGDE-90).
    cotizaciones = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = ["id", "tipo", "nombre", "identificacion", "telefono", "correo", "empresa",
                  "forma_pago", "observaciones_internas", "activo", "creado_en", "cotizaciones"]
        read_only_fields = ["creado_en"]
        # La unicidad se valida en validate_identificacion, con un mensaje que
        # distingue al cliente inactivo (el validador automático diría solo "duplicado").
        extra_kwargs = {"identificacion": {"validators": []}}

    def _sitios_permitidos(self):
        """Ids de sitio que puede ver el usuario; None = todos (superusuario).

        Se calcula una vez por petición. Se filtra en Python sobre el prefetch de la
        vista, porque tras un PATCH DRF borra esa caché y releería todo sin filtro.
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
        """Tipo con el que quedará el cliente: el del payload o, si no viene, el guardado.

        Se lee de initial_data (lo que llegó en la petición) porque los validadores
        de cada campo corren antes que validate(); así la regla del jurídico se
        aplica en validate_identificacion, antes de revisar duplicados.
        """
        tipo = getattr(self, "initial_data", {}).get("tipo")
        if tipo is None and self.instance is not None:
            tipo = self.instance.tipo
        return tipo

    def validate_identificacion(self, value):
        # SGDE-87: el NIT de un jurídico vive en su Empresa. Cliente.identificacion
        # solo es de personas naturales; en un jurídico se guarda null.
        if self._tipo_final() == Cliente.JURIDICA:
            if value:
                raise serializers.ValidationError(Cliente.MSG_JURIDICO_CON_IDENTIFICACION)
            return None
        # Vacía se guarda como null, nunca como "": dos "" chocarían con el unique (SGDE-91).
        if not value:
            return None
        existente = Cliente.objects.filter(identificacion=value)
        if self.instance:
            existente = existente.exclude(pk=self.instance.pk)
        existente = existente.first()
        if existente is None:
            return value
        if not existente.activo:
            # El id también va en un campo aparte del 400 (ver errors), para que la
            # pantalla no tenga que sacarlo del texto (SGDE-107).
            self._cliente_inactivo = existente.id
            raise serializers.ValidationError(
                f"Ya existe un cliente con esa identificación, pero está inactivo "
                f"(id {existente.id}). Puedes reactivarlo en lugar de crear uno nuevo."
            )
        raise serializers.ValidationError("Ya existe un cliente con esa identificación.")

    @property
    def errors(self):
        """Los errores de siempre y, si la identificación es de un cliente inactivo,
        "cliente_inactivo": <id> (SGDE-107). El mensaje de "identificacion" no cambia."""
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
        # En PATCH/PUT parciales el payload puede no traer tipo o empresa:
        # se completan con lo guardado para que la regla también valga al editar.
        tipo = data.get("tipo", self.instance.tipo if self.instance else None)
        empresa = data.get("empresa", self.instance.empresa if self.instance else None)
        if tipo == Cliente.JURIDICA and not empresa:
            raise serializers.ValidationError(
                {"empresa": "Debes asociar una empresa existente si el cliente es jurídico."}
            )
        # Jurídico sin "identificacion" en el payload (por ejemplo, la pantalla al
        # pasar un natural a jurídico, o un PATCH de otro campo de un jurídico viejo):
        # si tenía una guardada, se borra. Escribir null no choca con el unique
        # (PostgreSQL admite varias filas con NULL).
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
    email = serializers.EmailField()
    # Código de la ciudad, ej. "CTG". SGDE-115: un código que no existe da 400 en
    # "ciudad" (antes Ciudad.objects.get() lanzaba DoesNotExist y el API daba 500).
    ciudad = serializers.SlugRelatedField(
        slug_field="codigo", queryset=Ciudad.objects.all(),
        error_messages={"does_not_exist": "La ciudad no es válida.", "invalid": "La ciudad no es válida."},
    )
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
        # SGDE-115: la identificación repetida se informa en su campo. Antes llegaba
        # al unique de la base y salía el 400 genérico de IntegrityError, sin campo.
        # Natural: Cliente.identificacion. Jurídico: es el NIT, que vive en Empresa.
        if data["tipo"] == Cliente.JURIDICA:
            if Empresa.objects.filter(identificacion=data["identificacion"]).exists():
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
        ciudad = validated_data["ciudad"]  # ya es la Ciudad (SlugRelatedField)
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
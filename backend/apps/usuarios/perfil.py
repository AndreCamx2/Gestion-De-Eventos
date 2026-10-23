from django.db import IntegrityError, transaction
from django.db.models import Q
from rest_framework import serializers

from apps.clientes.validadores import validar_telefono

from .models import Usuario
from .validators import errores_password

MSG_NO_EDITABLE = "No se puede cambiar desde Mi perfil."
MSG_PASSWORD_INCORRECTA = "La contraseña actual no es correcta."
MSG_CORREO_REGISTRADO = "Este correo ya está registrado."
MSG_CORREO_IGUAL = "Es el mismo correo que ya tienes."
MSG_PASSWORD_IGUAL = "La contraseña nueva debe ser distinta de la actual."
MSG_CONTACTO_LARGO = "El contacto admite máximo 120 caracteres."

CAMPOS_EDITABLES = {"cliente": "telefono", "proveedor": "contacto"}


def inicia_con_correo(usuario):
    return bool(usuario.email) and usuario.username.lower() == usuario.email.lower()


def _acceso(usuario):
    return {"usuario": usuario.username, "correo": usuario.email, "inicia_con_correo": inicia_con_correo(usuario)}


def _datos_cliente(cliente):
    empresa = cliente.empresa
    return {
        "nombre": cliente.nombre,
        "tipo": cliente.tipo,
        "identificacion": cliente.identificacion or (empresa.identificacion if empresa else ""),
        "empresa": empresa.razon_social if empresa else "",
        "telefono": cliente.telefono,
    }


def _datos_proveedor(proveedor):
    return {
        "nombre": proveedor.nombre,
        "identificacion": proveedor.identificacion,
        "contacto": proveedor.contacto,
    }


def datos_perfil(usuario):
    rol = usuario.rol.codigo
    datos = _datos_cliente(usuario.cliente) if rol == "cliente" else _datos_proveedor(usuario.proveedor)
    return {"rol": rol, **datos, **_acceso(usuario)}


class EdicionClienteSerializer(serializers.Serializer):
    telefono = serializers.CharField(max_length=20, allow_blank=True, required=False)

    def validate_telefono(self, valor):
        return validar_telefono(valor)


class EdicionProveedorSerializer(serializers.Serializer):
    contacto = serializers.CharField(
        max_length=120, allow_blank=True, required=False, error_messages={"max_length": MSG_CONTACTO_LARGO},
    )


def actualizar_perfil(usuario, datos):
    rol = usuario.rol.codigo
    editable = CAMPOS_EDITABLES[rol]
    no_editables = sorted(campo for campo in datos if campo != editable)
    if no_editables:
        raise serializers.ValidationError({campo: [MSG_NO_EDITABLE] for campo in no_editables})

    serializer_class = EdicionClienteSerializer if rol == "cliente" else EdicionProveedorSerializer
    serializer = serializer_class(data=datos)
    serializer.is_valid(raise_exception=True)
    if editable not in serializer.validated_data:
        return
    ficha = usuario.cliente if rol == "cliente" else usuario.proveedor
    setattr(ficha, editable, serializer.validated_data[editable])
    ficha.save(update_fields=[editable])


class ConPasswordActualSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True, trim_whitespace=False)

    @property
    def usuario(self):
        return self.context["usuario"]

    def validate_password_actual(self, valor):
        if not self.usuario.check_password(valor):
            raise serializers.ValidationError(MSG_PASSWORD_INCORRECTA)
        return valor


def correo_en_uso(correo, excepto):
    return Usuario.objects.exclude(pk=excepto.pk).filter(Q(email__iexact=correo) | Q(username__iexact=correo)).exists()


class CambioCorreoSerializer(ConPasswordActualSerializer):
    correo_nuevo = serializers.EmailField(max_length=254)

    def validate_correo_nuevo(self, valor):
        correo = valor.lower()
        if correo == (self.usuario.email or "").lower():
            raise serializers.ValidationError(MSG_CORREO_IGUAL)
        if correo_en_uso(correo, self.usuario):
            raise serializers.ValidationError(MSG_CORREO_REGISTRADO)
        return correo


def cambiar_correo(usuario, correo):
    anterior = usuario.email
    usuario.email = correo
    campos = ["email"]
    if anterior and usuario.username.lower() == anterior.lower():
        usuario.username = correo
        campos.append("username")
    try:
        with transaction.atomic():
            usuario.save(update_fields=campos)
            cliente = getattr(usuario, "cliente", None)
            if cliente is not None:
                cliente.correo = correo
                cliente.save(update_fields=["correo"])
    except IntegrityError:
        raise serializers.ValidationError({"correo_nuevo": [MSG_CORREO_REGISTRADO]})
    return _acceso(usuario)


class CambioContrasenaSerializer(ConPasswordActualSerializer):
    password_nueva = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        nueva = attrs["password_nueva"]
        if self.usuario.check_password(nueva):
            raise serializers.ValidationError({"password_nueva": [MSG_PASSWORD_IGUAL]})
        mensajes = errores_password(
            nueva, username=self.usuario.username, email=self.usuario.email, first_name=self.usuario.first_name,
        )
        if mensajes:
            raise serializers.ValidationError({"password_nueva": mensajes})
        return attrs

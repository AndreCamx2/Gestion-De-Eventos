import re

from rest_framework import serializers

LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ"
PATRON_NOMBRE = re.compile(rf"^[{LETRAS}' -]+$")
PATRON_RAZON_SOCIAL = re.compile(rf"^[{LETRAS}0-9.,&' -]+$")
PATRON_CEDULA = re.compile(r"^\d{6,10}$")
PATRON_NIT = re.compile(r"^(\d{8,10})(?:-(\d))?$")
PATRON_TELEFONO = re.compile(r"^(3\d{9}|60\d{8})$")
PESOS_NIT = (3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71)

MSG_NOMBRE = "Solo letras, sin números ni símbolos."
MSG_NOMBRE_CORTO = "Escribe un nombre válido."
MSG_RAZON_SOCIAL = "La razón social solo admite letras, números y los signos . , & -"
MSG_CEDULA = "La cédula solo admite números, entre 6 y 10 dígitos."
MSG_NIT = "El NIT solo admite números, por ejemplo 900123456-8."
MSG_NIT_DIGITO = "El dígito de verificación del NIT no es correcto."
MSG_TELEFONO = "Escribe un celular de 10 dígitos o un fijo que empiece por 60."


def _espacios(valor):
    return re.sub(r"\s+", " ", valor).strip()


def digito_verificacion_nit(numero):
    suma = sum(int(d) * PESOS_NIT[i] for i, d in enumerate(reversed(numero)))
    resto = suma % 11
    return resto if resto < 2 else 11 - resto


def validar_nombre(valor):
    limpio = _espacios(valor)
    if not PATRON_NOMBRE.match(limpio):
        raise serializers.ValidationError(MSG_NOMBRE)
    if len(re.sub(rf"[^{LETRAS}]", "", limpio)) < 2:
        raise serializers.ValidationError(MSG_NOMBRE_CORTO)
    return limpio


def validar_razon_social(valor):
    limpio = _espacios(valor)
    if not PATRON_RAZON_SOCIAL.match(limpio) or len(limpio) < 3:
        raise serializers.ValidationError(MSG_RAZON_SOCIAL)
    return limpio


def validar_cedula(valor):
    limpio = re.sub(r"[\s.]", "", valor)
    if not PATRON_CEDULA.match(limpio):
        raise serializers.ValidationError(MSG_CEDULA)
    return limpio


def validar_nit(valor):
    limpio = re.sub(r"[\s.]", "", valor)
    coincidencia = PATRON_NIT.match(limpio)
    if not coincidencia:
        raise serializers.ValidationError(MSG_NIT)
    numero, digito = coincidencia.groups()
    if digito is not None and int(digito) != digito_verificacion_nit(numero):
        raise serializers.ValidationError(MSG_NIT_DIGITO)
    return limpio


def validar_telefono(valor):
    limpio = re.sub(r"[\s().-]", "", valor)
    if not limpio:
        return ""
    if limpio.startswith("+57"):
        limpio = limpio[3:]
    elif limpio.startswith("57") and len(limpio) == 12:
        limpio = limpio[2:]
    if not PATRON_TELEFONO.match(limpio):
        raise serializers.ValidationError(MSG_TELEFONO)
    return limpio

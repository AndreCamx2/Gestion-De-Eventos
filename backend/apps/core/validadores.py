"""Reglas de los campos de texto de los formularios (SGDE-123/124 y revisión de QA).

Hay cuatro clases de campo:
- Nombres de personas (usuarios, clientes): solo letras. validar_nombre.
- Nombres de cosas (venues, salones, conceptos, proveedores, elementos de stock):
  números permitidos, pero con al menos 2 letras. validar_nombre_cosa.
- Documentos y teléfonos: solo números con su formato. validar_cedula, validar_nit,
  validar_identificacion_proveedor, validar_telefono.
- Contacto: un teléfono o un nombre. validar_contacto.
Las mismas reglas están en frontend/src/utils/validacionesRegistro.js.
"""
import re

from rest_framework import serializers

LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ"
PATRON_NOMBRE = re.compile(rf"^[{LETRAS}' -]+$")
PATRON_RAZON_SOCIAL = re.compile(rf"^[{LETRAS}0-9.,&' -]+$")
PATRON_NOMBRE_COSA = re.compile(rf"^[{LETRAS}0-9 .,&'()/#+-]+$")
PATRON_CONTACTO = re.compile(rf"^[{LETRAS}0-9 .()+-]+$")
PATRON_USUARIO = re.compile(r"^[\w.@+-]+$")
PATRON_CEDULA = re.compile(r"^\d{6,10}$")
PATRON_NIT = re.compile(r"^(\d{8,10})(?:-(\d))?$")
PATRON_TELEFONO = re.compile(r"^(3\d{9}|60\d{8})$")
PESOS_NIT = (3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71)

MSG_NOMBRE = "Solo letras, sin números ni símbolos."
MSG_NOMBRE_CORTO = "Escribe un nombre válido."
MSG_RAZON_SOCIAL = "La razón social solo admite letras, números y los signos . , & -"
MSG_SIN_LETRAS = "Debe tener al menos 2 letras: no puede ser solo números o símbolos."
MSG_NOMBRE_COSA = "Solo letras, números y los signos . , - & ' ( ) / # +"
MSG_CONTACTO = "Escribe el nombre de una persona o un teléfono."
MSG_IDENTIFICACION_PROVEEDOR = "Escribe una cédula (6 a 10 dígitos) o un NIT, por ejemplo 900123456-8."
MSG_USUARIO = "Solo letras, números y los signos . @ + - _ (sin espacios)."
MSG_USUARIO_LETRAS = "El usuario debe tener al menos 3 letras (puede llevar números)."
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


def _letras(valor):
    return len(re.sub(rf"[^{LETRAS}]", "", valor))


def validar_razon_social(valor):
    limpio = _espacios(valor)
    if not PATRON_RAZON_SOCIAL.match(limpio) or len(limpio) < 3:
        raise serializers.ValidationError(MSG_RAZON_SOCIAL)
    if _letras(limpio) < 2:
        raise serializers.ValidationError(MSG_SIN_LETRAS)
    return limpio


def validar_nombre_cosa(valor):
    """"Salón 2" o "Coffee break x 50" sí; "123123123", "8888" o "!!!" no."""
    limpio = _espacios(valor)
    if not PATRON_NOMBRE_COSA.match(limpio):
        raise serializers.ValidationError(MSG_NOMBRE_COSA)
    if _letras(limpio) < 2:
        raise serializers.ValidationError(MSG_SIN_LETRAS)
    return limpio


def validar_usuario(valor):
    """Nombre de usuario para entrar: puede llevar números, pero con 3 letras o más."""
    limpio = valor.strip()
    if not PATRON_USUARIO.match(limpio):
        raise serializers.ValidationError(MSG_USUARIO)
    if _letras(limpio) < 3:
        raise serializers.ValidationError(MSG_USUARIO_LETRAS)
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


def validar_identificacion_proveedor(valor):
    """Opcional. Un proveedor puede ser persona (cédula) o empresa (NIT)."""
    limpio = re.sub(r"[\s.]", "", valor)
    if not limpio:
        return ""
    if PATRON_CEDULA.match(limpio):
        return limpio
    try:
        return validar_nit(limpio)
    except serializers.ValidationError as error:
        if PATRON_NIT.match(limpio):
            raise error  # Formato de NIT con dígito de verificación equivocado.
        raise serializers.ValidationError(MSG_IDENTIFICACION_PROVEEDOR)


def validar_contacto(valor):
    """Opcional. Solo números: debe ser un teléfono. Con letras: un nombre (puede llevar el número)."""
    limpio = _espacios(valor)
    if not limpio:
        return ""
    if _letras(limpio) == 0:
        if not re.search(r"\d", limpio):
            raise serializers.ValidationError(MSG_CONTACTO)
        return validar_telefono(limpio)
    if not PATRON_CONTACTO.match(limpio) or _letras(limpio) < 2:
        raise serializers.ValidationError(MSG_CONTACTO)
    return limpio

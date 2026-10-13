from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Usuario


def errores_password(password, *, username="", email="", first_name="", last_name=""):
    """Devuelve la lista de mensajes (en español) con que `password` falla los
    AUTH_PASSWORD_VALIDATORS de settings.py; lista vacía si es válida.

    Usa un Usuario temporal, sin guardar y sin full_clean(), solo para que
    UserAttributeSimilarityValidator compare la contraseña con los datos del
    usuario candidato.
    """
    candidato = Usuario(username=username, email=email, first_name=first_name, last_name=last_name)
    try:
        validate_password(password, user=candidato)
    except DjangoValidationError as e:
        return list(e.messages)
    return []


def validar_password_candidata(password, **datos_usuario):
    """Lanza ValidationError({"password": [msg, ...]}) (400 en DRF) si la contraseña es débil."""
    mensajes = errores_password(password, **datos_usuario)
    if mensajes:
        raise serializers.ValidationError({"password": mensajes})

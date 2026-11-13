from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Usuario


def errores_password(password, *, username="", email="", first_name="", last_name=""):
    """Mensajes de AUTH_PASSWORD_VALIDATORS para `password`. El Usuario temporal es para que
    UserAttributeSimilarityValidator compare con los datos del candidato.
    """
    candidato = Usuario(username=username, email=email, first_name=first_name, last_name=last_name)
    try:
        validate_password(password, user=candidato)
    except DjangoValidationError as e:
        return list(e.messages)
    return []


def validar_password_candidata(password, **datos_usuario):
    mensajes = errores_password(password, **datos_usuario)
    if mensajes:
        raise serializers.ValidationError({"password": mensajes})

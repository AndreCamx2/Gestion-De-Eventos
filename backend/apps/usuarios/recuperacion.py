from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from .correos import enviar_recuperacion_clave
from .models import Usuario


def enlace_de_recuperacion(usuario):
    parametros = urlencode({
        "uid": urlsafe_base64_encode(force_bytes(usuario.pk)),
        "token": default_token_generator.make_token(usuario),
    })
    return f"{settings.FRONTEND_URL}/restablecer-clave?{parametros}"


def solicitar_recuperacion(email):
    for usuario in Usuario.objects.filter(email__iexact=email, is_active=True):
        if usuario.has_usable_password():
            enviar_recuperacion_clave(usuario, enlace_de_recuperacion(usuario))


def usuario_del_enlace(uid, token):
    try:
        usuario = Usuario.objects.get(pk=force_str(urlsafe_base64_decode(uid)), is_active=True)
    except (ValueError, TypeError, OverflowError, Usuario.DoesNotExist):
        return None
    if not default_token_generator.check_token(usuario, token):
        return None
    return usuario


def cerrar_sesiones(usuario):
    vigentes = OutstandingToken.objects.filter(user=usuario, expires_at__gt=timezone.now())
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token=token) for token in vigentes], ignore_conflicts=True
    )


@transaction.atomic
def cambiar_clave(usuario, password):
    usuario.set_password(password)
    usuario.save(update_fields=["password"])
    cerrar_sesiones(usuario)

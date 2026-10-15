import logging

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _enviar(usuario, asunto, plantilla, contexto):
    try:
        send_mail(asunto, render_to_string(plantilla, contexto), None, [usuario.email])
    except Exception:
        logger.exception("No se pudo enviar el correo '%s' al usuario %s", asunto, usuario.pk)
        return False
    return True


def enviar_recuperacion_clave(usuario, enlace):
    contexto = {
        "usuario": usuario,
        "enlace": enlace,
        "minutos": settings.PASSWORD_RESET_TIMEOUT // 60,
    }
    return _enviar(usuario, "Recupera tu contraseña de SGDE", "usuarios/correos/recuperar_clave.txt", contexto)


def enviar_bienvenida(cliente):
    usuario = cliente.usuario
    contexto = {
        "nombre": cliente.nombre,
        "correo": usuario.email,
        "enlace": f"{settings.FRONTEND_URL}/login",
    }
    return _enviar(usuario, "Bienvenido a SGDE", "usuarios/correos/bienvenida.txt", contexto)

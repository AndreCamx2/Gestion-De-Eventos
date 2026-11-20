import logging
import threading

from django.conf import settings
from django.core.mail import send_mail
from django.core.mail.backends.base import BaseEmailBackend
from django.db import connections
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


class CorreoSinConfigurar(BaseEmailBackend):
    """No envía nada y deja un error en el log: la consola dejaría el token de recuperar en los logs."""

    def send_messages(self, email_messages):
        for mensaje in email_messages:
            logger.error(
                "Correo no enviado ('%s'): falta configurar EMAIL_BACKEND y el SMTP en el entorno.",
                mensaje.subject,
            )
        return 0


def en_segundo_plano(funcion, *args):
    """Así recuperar contraseña tarda lo mismo exista o no el correo."""
    if not settings.CORREOS_EN_SEGUNDO_PLANO:
        funcion(*args)
        return None

    def ejecutar():
        try:
            funcion(*args)
        except Exception:
            logger.exception("Falló una tarea de correo en segundo plano")
        finally:
            # El hilo abre su propia conexión a la base: se cierra al terminar.
            connections.close_all()

    hilo = threading.Thread(target=ejecutar, daemon=True)
    hilo.start()
    return hilo


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

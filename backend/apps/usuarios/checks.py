"""Chequeos de arranque de la configuración de correo (SGDE-96).

Corren con `manage.py check` y antes de `migrate`, que el Dockerfile ejecuta en
cada arranque: los avisos quedan en los logs de Render. Solo avisan, no impiden
arrancar: un correo sin configurar no debe tumbar el resto del sistema.

Miran los valores y no DEBUG: durante las pruebas Django pone DEBUG=False y
avisarían en cada corrida local. Esos valores solo aparecen en producción
(DEBUG=False al importar settings.py) cuando falta la variable.
"""
from django.conf import settings
from django.core.checks import Tags, Warning, register

BACKEND_SIN_CONFIGURAR = "apps.usuarios.correos.CorreoSinConfigurar"


@register(Tags.compatibility)
def revisar_correo(app_configs, **kwargs):
    avisos = []
    if settings.EMAIL_BACKEND == BACKEND_SIN_CONFIGURAR:
        avisos.append(Warning(
            "No hay EMAIL_BACKEND en el entorno: los correos (recuperar contraseña, bienvenida) no se envían.",
            hint="Define EMAIL_BACKEND, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD y DEFAULT_FROM_EMAIL "
                 "(ver backend/.env.example).",
            id="sgde.W001",
        ))
    if not settings.FRONTEND_URL:
        avisos.append(Warning(
            "Falta FRONTEND_URL: los enlaces de los correos no llevan a ninguna parte.",
            hint="Define FRONTEND_URL con la URL del frontend en Vercel.",
            id="sgde.W002",
        ))
    return avisos

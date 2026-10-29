from django.apps import AppConfig


class UsuariosConfig(AppConfig):
    name = 'apps.usuarios'

    def ready(self):
        # Registra los chequeos de la configuración de correo (SGDE-96).
        from . import checks  # noqa: F401

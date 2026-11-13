from django.apps import AppConfig


class UsuariosConfig(AppConfig):
    name = 'apps.usuarios'

    def ready(self):
        from . import checks  # noqa: F401

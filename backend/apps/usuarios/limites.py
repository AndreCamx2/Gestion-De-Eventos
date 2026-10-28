"""Límite de intentos por IP en las vistas públicas de acceso (SGDE-112).

Login, renovación del token y registro público aceptaban peticiones sin límite:
fuerza bruta de contraseñas y creación masiva de cuentas. Cada vista declara su
`throttle_scope` y la tasa sale de REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
(settings.py), que se puede ajustar por variable de entorno.
"""
from django.conf import settings
from rest_framework.exceptions import Throttled
from rest_framework.throttling import ScopedRateThrottle

MSG_MUCHOS_INTENTOS = "Hiciste muchos intentos seguidos. Espera un momento y vuelve a intentarlo."


class LimiteDeIntentos(ScopedRateThrottle):
    """ScopedRateThrottle que lee la tasa en cada petición.

    El de DRF la copia una sola vez al importar, así que override_settings no la
    cambia: con esta clase las pruebas pueden fijar una tasa baja y comprobar el 429.
    Sin tasa para el scope, no limita.
    """

    def get_rate(self):
        return settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}).get(self.scope)


class ConLimiteDeIntentos:
    """Mixin para una vista: aplica LimiteDeIntentos y responde 429 con un mensaje claro.

    La vista debe declarar `throttle_scope`. Se cuenta por IP (cliente anónimo).
    """

    throttle_classes = [LimiteDeIntentos]

    def throttled(self, request, wait):
        raise Throttled(wait=wait, detail=MSG_MUCHOS_INTENTOS)

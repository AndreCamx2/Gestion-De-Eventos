from django.conf import settings
from rest_framework.exceptions import Throttled
from rest_framework.throttling import ScopedRateThrottle

MSG_MUCHOS_INTENTOS = "Hiciste muchos intentos seguidos. Espera un momento y vuelve a intentarlo."


class LimiteDeIntentos(ScopedRateThrottle):
    """Lee la tasa en cada petición: la de DRF se copia al importar y override_settings no la cambia."""

    def get_rate(self):
        return settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}).get(self.scope)


class ConLimiteDeIntentos:
    throttle_classes = [LimiteDeIntentos]

    def throttled(self, request, wait):
        raise Throttled(wait=wait, detail=MSG_MUCHOS_INTENTOS)

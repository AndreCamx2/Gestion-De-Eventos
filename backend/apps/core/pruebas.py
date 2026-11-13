from django.conf import settings
from django.test import override_settings

ESCOPOS_DE_ACCESO = ("login", "renovar_token", "registro", "cambiar_credenciales")


def sin_limite_de_intentos(clase):
    """Sube los límites de acceso solo para esta clase: con las tasas reales darían 429."""
    tasas = {**settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"], **{e: "10000/min" for e in ESCOPOS_DE_ACCESO}}
    return override_settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": tasas})(clase)


def correos_en_linea(clase):
    """Envía los correos dentro de la petición: un hilo aparte no vería los datos de la prueba."""
    return override_settings(CORREOS_EN_SEGUNDO_PLANO=False)(clase)

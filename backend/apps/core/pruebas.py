"""Ayudas compartidas por las pruebas."""
from django.conf import settings
from django.test import override_settings

ESCOPOS_DE_ACCESO = ("login", "renovar_token", "registro")


def sin_limite_de_intentos(clase):
    """Sube los límites de login, renovación y registro solo para esta clase de pruebas.

    Muchas pruebas entran al login o se registran varias veces seguidas y, con las
    tasas reales (SGDE-112), recibirían 429. settings.py no sabe nada de pruebas:
    cada clase que lo necesita lo pide con este decorador. Las demás tasas (por
    ejemplo recuperar_clave) se quedan como están.
    """
    tasas = {**settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"], **{e: "10000/min" for e in ESCOPOS_DE_ACCESO}}
    return override_settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": tasas})(clase)

from django.db import IntegrityError
from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Manejador global de excepciones para Django REST Framework.
    Intercepta errores de integridad relacional y borrado protegido de la base de datos,
    garantizando respuestas estructuradas en formato JSON con codigo HTTP 400 Bad Request.
    """
    response = exception_handler(exc, context)

    if response is None:
        if isinstance(exc, ProtectedError):
            return Response(
                {
                    "detail": "No es posible eliminar o modificar el registro porque existen elementos dependientes vinculados.",
                    "error_type": "ProtectedError",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if isinstance(exc, IntegrityError):
            return Response(
                {
                    "detail": "Error de integridad relacional o duplicidad de clave en la base de datos.",
                    "error_type": "IntegrityError",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    return response

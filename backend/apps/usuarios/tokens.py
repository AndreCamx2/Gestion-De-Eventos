"""Renovación de tokens con rotación y tope de duración (SGDE-92)."""
from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings


class RenovarTokenConTopeSerializer(TokenRefreshSerializer):
    """POST /api/token/refresh/: access nuevo + refresh nuevo que conserva el vencimiento.

    Con ROTATE_REFRESH_TOKENS, simplejwt le da al refresh nuevo otras
    REFRESH_TOKEN_LIFETIME horas contadas desde la renovación: una sesión en uso
    no vencería nunca. Aquí el refresh nuevo vence cuando vencía el original,
    así la sesión sigue terminando JWT_REFRESH_HOURS después del login (SGDE-86).

    Con BLACKLIST_AFTER_ROTATION, el refresh usado queda en la lista negra.
    """

    def validate(self, attrs):
        # Valida firma, tipo, vencimiento y que no esté en la lista negra (TokenError → 401).
        refresh = self.token_class(attrs["refresh"])

        # Misma regla que simplejwt (usuario existente y activo), pero un usuario
        # borrado da 401 en vez del 500 de objects.get() en simplejwt.
        user_id = refresh.payload.get(api_settings.USER_ID_CLAIM)
        if user_id is not None:
            usuario = get_user_model().objects.filter(**{api_settings.USER_ID_FIELD: user_id}).first()
            if usuario is None or not api_settings.USER_AUTHENTICATION_RULE(usuario):
                raise AuthenticationFailed(self.error_messages["no_active_account"], "no_active_account")

        data = {"access": str(refresh.access_token)}

        if api_settings.ROTATE_REFRESH_TOKENS:
            vencimiento_original = refresh.payload["exp"]
            if api_settings.BLACKLIST_AFTER_ROTATION:
                refresh.blacklist()
            refresh.set_jti()
            refresh.set_iat()
            refresh.payload["exp"] = vencimiento_original  # tope: no se alarga la sesión
            refresh.outstand()  # queda registrado para poder invalidarlo en el logout
            data["refresh"] = str(refresh)

        return data

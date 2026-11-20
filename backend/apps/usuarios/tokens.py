from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings


class RenovarTokenConTopeSerializer(TokenRefreshSerializer):
    """El refresh nuevo vence cuando vencía el original: con la rotación de simplejwt una
    sesión en uso no vencería nunca.
    """

    def validate(self, attrs):
        refresh = self.token_class(attrs["refresh"])

        # Un usuario borrado da 401 y no el 500 de simplejwt.
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

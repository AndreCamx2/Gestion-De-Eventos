from rest_framework.exceptions import ValidationError

from .models import Usuario

ROL_ADMINISTRADOR = "administrador"
ROL_CLIENTE = "cliente"

MSG_SUPERUSUARIO = (
    "Este usuario es superusuario: darlo de baja o cambiarle el rol solo se hace "
    "desde el panel de administración de Django."
)
MSG_A_SI_MISMO = (
    "No puedes darte de baja ni cambiar tu propio rol. Pídeselo a otro administrador."
)
MSG_ULTIMO_ADMIN = (
    "No se puede: es el último administrador activo. Crea o activa otro administrador primero."
)
MSG_ROL_CON_CLIENTE = (
    "No se puede cambiar el rol de un usuario vinculado a un cliente. Gestiónalo desde Clientes."
)
MSG_ROL_CLIENTE = (
    "El rol «cliente» no se asigna a usuarios internos: se crea al registrar un cliente."
)


def _error(campo, mensaje):
    """Mismo formato que los errores de serializer ({campo: [mensaje]}); en DELETE,
    donde no hay campo, `detail` va como texto plano."""
    return ValidationError({campo: mensaje if campo == "detail" else [mensaje]})


def validar_cambio_usuario(instancia, actor, *, nuevo_rol=None, nuevo_activo=None, campo_baja="is_active"):
    """Reglas de seguridad al cambiar el rol o dar de baja a un usuario.

    Debe llamarse DENTRO de transaction.atomic(): la comprobación del último
    administrador bloquea filas (select_for_update) hasta que termine la transacción.

    - nuevo_rol: el Rol que se quiere asignar (None = no cambia).
    - nuevo_activo: el is_active que se quiere fijar (None = no cambia).
    - campo_baja: clave del error cuando falla por una baja ("detail" en DELETE).
    """
    cambia_rol = nuevo_rol is not None and nuevo_rol != instancia.rol
    es_baja = instancia.is_active and nuevo_activo is False

    if not (cambia_rol or es_baja):
        return

    # Cada error se asocia al campo que el cliente intentó tocar.
    campo = "rol" if cambia_rol else campo_baja

    if instancia.is_superuser:
        raise _error(campo, MSG_SUPERUSUARIO)

    if actor is not None and instancia.pk == actor.pk:
        raise _error(campo, MSG_A_SI_MISMO)

    if cambia_rol:
        if getattr(instancia, "cliente", None) is not None:
            raise _error("rol", MSG_ROL_CON_CLIENTE)
        if nuevo_rol.codigo == ROL_CLIENTE:
            raise _error("rol", MSG_ROL_CLIENTE)

    deja_de_ser_admin_activo = (
        instancia.is_active
        and instancia.rol.codigo == ROL_ADMINISTRADOR
        and (es_baja or (cambia_rol and nuevo_rol.codigo != ROL_ADMINISTRADOR))
    )
    if deja_de_ser_admin_activo:
        # Se bloquean TODOS los administradores activos (incluido este): si dos
        # peticiones simultáneas intentan quitarse mutuamente, la segunda espera,
        # vuelve a leer y ve que ya no queda otro administrador.
        activos = list(
            Usuario.objects.select_for_update(of=("self",))
            .filter(rol__codigo=ROL_ADMINISTRADOR, is_active=True)
            .values_list("pk", flat=True)
        )
        if not any(pk != instancia.pk for pk in activos):
            raise _error(campo, MSG_ULTIMO_ADMIN)

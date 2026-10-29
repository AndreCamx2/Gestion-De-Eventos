from datetime import timedelta
from pathlib import Path
import os
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv
import dj_database_url

load_dotenv()


def entero_positivo_entorno(nombre, defecto):
    """Lee un entero mayor que cero de una variable de entorno.

    Si la variable no existe (o está vacía) devuelve `defecto`. Si tiene un valor
    que no es un entero positivo, el servidor no arranca: es mejor un error claro
    que una sesión con una duración inesperada.
    """
    valor = os.getenv(nombre, "").strip()
    if not valor:
        return defecto
    try:
        numero = int(valor)
    except ValueError:
        numero = 0
    if numero <= 0:
        raise ImproperlyConfigured(
            f"La variable de entorno {nombre} debe ser un número entero mayor que cero "
            f"(recibido: {valor!r})."
        )
    return numero


BASE_DIR = Path(__file__).resolve().parent.parent

# Sin valor por defecto a propósito (SEG-003): si falta, el servidor no arranca.
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    raise ImproperlyConfigured(
        "Falta la variable de entorno SECRET_KEY. Defínela en backend/.env (local) "
        "o en las variables de entorno de Render (producción)."
    )

# Por defecto False: si falta la variable DEBUG en el entorno, el backend
# arranca en modo seguro (sin tracebacks expuestos) en vez de modo debug.
DEBUG = os.getenv('DEBUG', 'False') == 'True'

# Hosts permitidos: lee la variable de Render o permite localhost por defecto
allowed_hosts_env = os.getenv('ALLOWED_HOSTS')
if allowed_hosts_env:
    ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(',')]
else:
    ALLOWED_HOSTS = ['*'] if DEBUG else ['.onrender.com', 'localhost', '127.0.0.1']

# HTTPS en producción (SGDE-113). Solo con DEBUG=False: en local no hay HTTPS.
# - Render recibe el HTTPS y le pasa la petición a Django por HTTP, avisando con
#   X-Forwarded-Proto. Sin SECURE_PROXY_SSL_HEADER, Django creería que todo es HTTP
#   (la redirección no pararía nunca y el admin rechazaría el login por CSRF).
# - Las pruebas de CI corren con DEBUG=False y su cliente usa HTTP: apagan la
#   redirección con SECURE_SSL_REDIRECT=False en .github/workflows/deploy.yml.
# - HSTS empieza en 1 hora. Una vez confirmado que todo funciona por HTTPS, se sube
#   con SECURE_HSTS_SECONDS (por ejemplo 31536000, un año) sin tocar código.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() in ("true", "1")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = entero_positivo_entorno("SECURE_HSTS_SECONDS", 3600)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # W021 pide SECURE_HSTS_PRELOAD (la lista de HSTS que traen los navegadores).
    # Esa lista solo acepta dominios propios, y sgde-backend.onrender.com es un
    # subdominio de Render. Se silencia; con un dominio propio se puede activar.
    SILENCED_SYSTEM_CHECKS = ["security.W021"]


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    # Lista negra de refresh tokens (SGDE-92): logout y rotación los invalidan.
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "apps.usuarios",
    "apps.sitios",
    "apps.clientes",
    "apps.salones",
    "apps.catalogo",
    "apps.proveedores",
    "apps.cotizaciones",
    "apps.core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Configuración CORS y orígenes confiables (Local + Vercel)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost",
    "http://127.0.0.1:5173",
    "http://localhost:8080",   # frontend en Docker (docker-compose)
    "http://127.0.0.1:8080",
]

# Si defines FRONTEND_URL en Render (la URL de Vercel), la añade automáticamente
frontend_url = os.getenv('FRONTEND_URL')
if frontend_url:
    CORS_ALLOWED_ORIGINS.append(frontend_url)

# Producción y previews de Vercel de ESTE proyecto (gestion-de-eventos-*.vercel.app).
# Un solo nivel de subdominio ([a-z0-9-]) para no aceptar hosts con puntos.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://gestion-de-eventos[a-z0-9-]*\.vercel\.app$",
]

# Orígenes desde los que se aceptan formularios con CSRF. Solo los usa el admin de
# Django (el API usa JWT, sin CSRF), que vive en el mismo dominio del backend.
# Antes confiaba en cualquier *.onrender.com y *.vercel.app (SGDE-113).
CSRF_TRUSTED_ORIGINS = [
    origen.strip()
    for origen in os.getenv("CSRF_TRUSTED_ORIGINS", "https://sgde-backend.onrender.com").split(",")
    if origen.strip()
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

AUTH_USER_MODEL = "usuarios.Usuario"


# En Render lee DATABASE_URL; en local usa las variables de tu docker-compose
DATABASE_URL = os.getenv('DATABASE_URL')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'sgde_db'),
            'USER': os.getenv('DB_USER', 'postgres'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
            'HOST': os.getenv('DB_HOST', 'db'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }


# Caché en la base de datos (SGDE-120). Los límites de intentos de DRF (SGDE-112)
# cuentan en la caché. Con la de memoria, cada worker de gunicorn llevaría su
# propia cuenta y el tope real se multiplicaría por el número de workers. La tabla
# la crea `manage.py createcachetable` al arrancar (Dockerfile y docker-compose);
# las pruebas la crean solas.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "sgde_cache",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True


STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Límite de intentos por IP en las vistas públicas de acceso (SGDE-112).
# Formato de DRF: "<número>/<second|minute|hour|day>". Se cambian por variable de
# entorno, por ejemplo THROTTLE_LOGIN=10/min en backend/.env.
# Las pruebas que entran al login muchas veces suben la tasa solo para ellas con
# @sin_limite_de_intentos (apps/core/pruebas.py).
TASA_LOGIN = os.getenv("THROTTLE_LOGIN", "5/min")
TASA_RENOVAR_TOKEN = os.getenv("THROTTLE_RENOVAR_TOKEN", "30/min")
TASA_REGISTRO = os.getenv("THROTTLE_REGISTRO", "10/hour")
TASA_CAMBIAR_CREDENCIALES = os.getenv("THROTTLE_CAMBIAR_CREDENCIALES", "10/hour")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
    # Cuántos proxies hay delante de Django; con esto DRF sabe qué IP de
    # X-Forwarded-For es la del cliente. Sin fijarlo, DRF usa el encabezado
    # COMPLETO como "IP", y quien lo cambie en cada petición se salta todos
    # los límites de intentos (SGDE-112). En local (runserver) no hay proxy: 0.
    # En Render hay uno delante: 1.
    "NUM_PROXIES": int(os.getenv("NUM_PROXIES", "0" if DEBUG else "1")),
    "DEFAULT_THROTTLE_RATES": {
        "recuperar_clave": "5/hour",
        "restablecer_clave": "20/hour",
        # SGDE-112: login, renovación del token y registro público, por IP.
        "login": TASA_LOGIN,
        "renovar_token": TASA_RENOVAR_TOKEN,
        "registro": TASA_REGISTRO,
        "cambiar_credenciales": TASA_CAMBIAR_CREDENCIALES,
    },
}

# Duración de los tokens JWT (SGDE-86). Sin esto, simplejwt usa 5 minutos para
# el acceso y la sesión vencía a mitad del trabajo. El frontend renueva el
# acceso solo con /api/token/refresh/ mientras el refresco siga vigente.
# Para probar en local con 1 minuto: JWT_ACCESS_MINUTES=1 en backend/.env.
#
# Lista negra y rotación (SGDE-92):
# - POST /api/token/logout/ con {"refresh": ...} pone ese refresh en la lista
#   negra: ya no sirve para pedir accesos nuevos.
# - Cada /api/token/refresh/ entrega un refresh nuevo y pone el anterior en la
#   lista negra. El nuevo conserva el vencimiento del original
#   (RenovarTokenConTopeSerializer), así que la sesión sigue terminando
#   JWT_REFRESH_HOURS después del login, como en SGDE-86.
# - Límite aceptado: el ACCESS no se invalida al cerrar sesión. Es un JWT sin
#   estado y sigue sirviendo hasta que vence (JWT_ACCESS_MINUTES).
# - Los refresh vencidos se borran con `python manage.py flushexpiredtokens`
#   (lo corre el Dockerfile al arrancar).
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=entero_positivo_entorno("JWT_ACCESS_MINUTES", 30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=entero_positivo_entorno("JWT_REFRESH_HOURS", 12)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "TOKEN_REFRESH_SERIALIZER": "apps.usuarios.tokens.RenovarTokenConTopeSerializer",
}

# A dónde apuntan los enlaces de los correos. En producción sin la variable queda
# vacío (nunca localhost) y el chequeo sgde.W002 lo avisa al arrancar.
FRONTEND_URL = (os.getenv("FRONTEND_URL") or ("http://localhost:5173" if DEBUG else "")).rstrip("/")

# Correo (SGDE-96). En local, sin EMAIL_BACKEND, los correos salen en la consola.
# En producción (DEBUG=False) sin EMAIL_BACKEND no se envía nada y queda un error
# en el log, sin el contenido (el enlace de recuperar lleva un token): nunca la
# consola. El chequeo sgde.W001 lo avisa al arrancar (apps/usuarios/checks.py).
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND") or (
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "apps.usuarios.correos.CorreoSinConfigurar"
)
# Enviar los correos fuera de la petición, para que el tiempo de respuesta no
# revele qué correos están registrados. Las pruebas lo apagan con @correos_en_linea.
CORREOS_EN_SEGUNDO_PLANO = os.getenv("CORREOS_EN_SEGUNDO_PLANO", "True").lower() in ("true", "1")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = entero_positivo_entorno("EMAIL_PORT", 587)
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1")
EMAIL_TIMEOUT = 10
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "SGDE <no-responder@sgde.local>")

PASSWORD_RESET_TIMEOUT = 60 * entero_positivo_entorno("RECUPERAR_CLAVE_MINUTOS", 60)

# Sin esto, Django no imprime los errores 500 en los logs de Render
# (DEBUG=False los manda a un handler de email que no está configurado).
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}
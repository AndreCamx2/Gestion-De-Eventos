from datetime import timedelta
from pathlib import Path
import os
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv
import dj_database_url

load_dotenv()


def entero_positivo_entorno(nombre, defecto):
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

# Sin la variable, modo seguro: no se exponen tracebacks.
DEBUG = os.getenv('DEBUG', 'False') == 'True'

allowed_hosts_env = os.getenv('ALLOWED_HOSTS')
if allowed_hosts_env:
    ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(',')]
else:
    ALLOWED_HOSTS = ['*'] if DEBUG else ['.onrender.com', 'localhost', '127.0.0.1']

# Render termina el HTTPS y avisa con X-Forwarded-Proto; sin SECURE_PROXY_SSL_HEADER
# la redirección a HTTPS no pararía nunca. El CI la apaga con SECURE_SSL_REDIRECT=False.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() in ("true", "1")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = entero_positivo_entorno("SECURE_HSTS_SECONDS", 3600)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # La lista de preload solo acepta dominios propios, no un subdominio de Render.
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

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost",
    "http://127.0.0.1:5173",
    "http://localhost:8080",   # frontend en Docker (docker-compose)
    "http://127.0.0.1:8080",
]

frontend_url = os.getenv('FRONTEND_URL')
if frontend_url:
    CORS_ALLOWED_ORIGINS.append(frontend_url)

# Producción y previews de este proyecto en Vercel, sin aceptar hosts con puntos.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://gestion-de-eventos[a-z0-9-]*\.vercel\.app$",
]

# Solo los usa el admin de Django: el API va con JWT.
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


# En la base y no en memoria: los límites de intentos se cuentan en la caché, y con
# memoria cada worker de gunicorn llevaría su propia cuenta.
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


# Intentos por IP en login, renovación y registro, por ejemplo THROTTLE_LOGIN=10/min.
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
    # Proxies delante de Django (Render: 1, local: 0). Sin esto DRF toma todo
    # X-Forwarded-For como IP y cambiándolo se salta los límites de intentos.
    "NUM_PROXIES": int(os.getenv("NUM_PROXIES", "0" if DEBUG else "1")),
    "DEFAULT_THROTTLE_RATES": {
        "recuperar_clave": "5/hour",
        "restablecer_clave": "20/hour",
        "login": TASA_LOGIN,
        "renovar_token": TASA_RENOVAR_TOKEN,
        "registro": TASA_REGISTRO,
        "cambiar_credenciales": TASA_CAMBIAR_CREDENCIALES,
    },
}

# Con los 5 minutos de simplejwt la sesión vencía a mitad del trabajo. Al cerrar
# sesión el access sigue sirviendo hasta que vence: es un JWT sin estado.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=entero_positivo_entorno("JWT_ACCESS_MINUTES", 30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=entero_positivo_entorno("JWT_REFRESH_HOURS", 12)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "TOKEN_REFRESH_SERIALIZER": "apps.usuarios.tokens.RenovarTokenConTopeSerializer",
}

# En producción sin la variable queda vacío, nunca localhost (lo avisa sgde.W002).
FRONTEND_URL = (os.getenv("FRONTEND_URL") or ("http://localhost:5173" if DEBUG else "")).rstrip("/")

# En producción nunca a la consola: el enlace de recuperar lleva un token (sgde.W001).
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND") or (
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "apps.usuarios.correos.CorreoSinConfigurar"
)
# Fuera de la petición: el tiempo de respuesta no debe revelar qué correos existen.
CORREOS_EN_SEGUNDO_PLANO = os.getenv("CORREOS_EN_SEGUNDO_PLANO", "True").lower() in ("true", "1")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = entero_positivo_entorno("EMAIL_PORT", 587)
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1")
EMAIL_TIMEOUT = 10
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "SGDE <no-responder@sgde.local>")

PASSWORD_RESET_TIMEOUT = 60 * entero_positivo_entorno("RECUPERAR_CLAVE_MINUTOS", 60)

# Sin esto los errores 500 no salen en los logs de Render.
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
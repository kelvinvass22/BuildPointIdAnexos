"""
Configurações do BuildPoint ID — backend Django + DRF.

Traduz os requisitos não funcionais da Etapa 3:
- RNF04: Node.js + Firebase foi substituído por Django + PostgreSQL, mas o
  princípio (sync em tempo real, hospedado em nuvem) se mantém.
- RNF07 / LGPD: nenhuma imagem facial crua é aceita nos models (ver
  biometria/models.py) e dados sensíveis exigem HTTPS + variáveis de
  ambiente para segredos (nunca hardcoded).
- RS01: controle de acesso por papel (ver usuarios/permissions.py).

Hospedagem prevista: Render (web service). As variáveis abaixo batem com
o que o Render injeta automaticamente (DATABASE_URL, PORT) — ver render.yaml.
"""
import os
from datetime import timedelta
from pathlib import Path

import dj_database_url

# from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent


def env(key, default=None, cast=None):
    value = os.environ.get(key, default)
    if value is None:
        return value
    if cast is bool and isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    if cast is list and isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return value


# --------------------------------------------------------------------------
# Segurança
# --------------------------------------------------------------------------
SECRET_KEY = env("SECRET_KEY", default="django-django-insecure-troque-isso-em-producao")
DEBUG = env("DEBUG", default=False, cast=bool)

ALLOWED_HOSTS = env("ALLOWED_HOSTS", default="localhost,127.0.0.1,.onrender.com", cast=list)


SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# --------------------------------------------------------------------------
# Apps
# --------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",

    "usuarios",
    "obras",
    "biometria",
    "ponto",
    "relatorios",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

DATABASE_URL = env("DATABASE_URL", default="")
if not DATABASE_URL and env("POSTGRES_DB", default=""):
    DATABASE_URL = (
        f"postgresql://{env('POSTGRES_USER')}:{env('POSTGRES_PASSWORD')}"
        f"@{env('POSTGRES_HOST', default='localhost')}:{env('POSTGRES_PORT', default='5432')}"
        f"/{env('POSTGRES_DB')}"
    )

DATABASES = {
    "default": dj_database_url.config(
        default=DATABASE_URL or f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
        ssl_require=env("DB_SSL_REQUIRE", default=False, cast=bool),
    )
}


AUTH_USER_MODEL = "usuarios.Usuario"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        # RT01 do Etapa 3: pico de marcações às 07:00 -- throttle generoso,
        # mas presente, para não deixar um dispositivo com bug martelar a API.
        "marcacoes": "30/min",
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    # RNF02: Face ID <=3s -- token de vida curta reduz janela de uso indevido
    # em caso de aparelho perdido/roubado no canteiro.
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "USER_ID_FIELD": "id",
}

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS", default="", cast=list)
CORS_ALLOW_CREDENTIALS = True

# --------------------------------------------------------------------------
# Integrações externas (ver conversa sobre APIs — todas via variável de
# ambiente, nunca hardcoded no código).
# --------------------------------------------------------------------------
# "falso" usa ServicoFacialFalso (dev/testes, sem credenciais reais);
# troque para "aws" em produção assim que as chaves abaixo existirem.
FACE_SERVICE_PROVIDER = env("FACE_SERVICE_PROVIDER", default="falso")
AWS_REKOGNITION_REGION = env("AWS_REKOGNITION_REGION", default="us-east-1")
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")
AWS_REKOGNITION_COLLECTION_ID = env("AWS_REKOGNITION_COLLECTION_ID", default="buildpoint-operarios")

GOOGLE_MAPS_API_KEY = env("GOOGLE_MAPS_API_KEY", default="")

BIRDID_API_URL = env("BIRDID_API_URL", default="")
BIRDID_API_TOKEN = env("BIRDID_API_TOKEN", default="")

# --------------------------------------------------------------------------
# Logging — RS03 pede rastreabilidade; log estruturado ajuda a debugar sem
# nunca logar dado biométrico ou senha.
# --------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}


SPECTACULAR_SETTINGS = {
    'TITLE': 'BuildPoint ID API',
    'DESCRIPTION': 'Documentação interativa da API do BuildPoint ID.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
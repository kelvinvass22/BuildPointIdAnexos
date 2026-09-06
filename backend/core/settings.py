"""
Configurações do BuildPoint ID — backend Django + DRF.

Traduz os requisitos não funcionais da Etapa 3:
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


BIRDID_API_URL = env("BIRDID_API_URL", default="")
BIRDID_API_TOKEN = env("BIRDID_API_TOKEN", default="")

# --------------------------------------------------------------------------
# Biometria facial (RS02/LGPD) — troca de arquitetura: TensorFlow.js +
# landmarks geométricos (proporções do rosto) -> embedding real de rede
# neural (ArcFace/MobileFaceNet, .tflite, extraído no dispositivo com
# `react-native-fast-tflite`). Ver frontend/src/services/faceVectorService.js.
#
# FACE_LIMIAR_CONFIANCA: limiar de similaridade de cosseno pra aceitar uma
# batida como a mesma pessoa. O valor de 0.90 (herdado da fase de vetor
# geométrico) NÃO se aplica a embeddings de rede treinada -- a distribuição
# de similaridade é outra.
#
# O modelo em uso (frontend/assets/models/mobilefacenet.tflite, do
# repositório MCarlomagno/FaceRecognitionAuth) tem, na implementação de
# referência (Flutter/tflite_flutter), um limiar publicado de DISTÂNCIA
# EUCLIDIANA <= 0.5 sobre o embedding bruto (sem normalizar). Aqui o
# embedding é L2-normalizado antes de comparar (ver
# faceVectorService.js:l2Normalize / biometria/services.py), então dá pra
# converter: pra vetores unitários, distância^2 = 2 - 2*cosseno, logo
# cosseno = 1 - distância^2/2. Com distância=0.5: cosseno ~= 0.875. Esse é
# só o ponto de partida -- o 0.5 de referência também não era rigorosamente
# calibrado, então valide com capturas reais (mesma pessoa em
# ângulos/dias diferentes deve ficar ACIMA do limiar; pessoas diferentes,
# ABAIXO) antes de ir pra produção. Ajustável sem deploy de código via
# variável de ambiente.
FACE_LIMIAR_CONFIANCA = float(env("FACE_LIMIAR_CONFIANCA", default="0.875"))

# Identifica, nos registros novos, qual SDK/modelo gerou o vetor -- útil
# pra nunca comparar um vetor geométrico antigo com um embedding novo (são
# espaços vetoriais diferentes; ver BiometriaFacial.algoritmo).
FACE_ALGORITMO_PADRAO = env("FACE_ALGORITMO_PADRAO", default="mobilefacenet-tflite-v1")

# Chave simétrica (Fernet) usada para cifrar o vetor/embedding em repouso
# (biometria/services.py). Antes esse campo só era JSON puro -- virou
# crítico cifrar de verdade agora que o endpoint /api/biometria/minha/
# manda esse valor de volta pro APARELHO DO PRÓPRIO OPERÁRIO (pra permitir
# validação facial 100% offline). Gere uma chave com:
#   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# e configure via variável de ambiente em produção -- o default abaixo só
# serve pra não quebrar em dev/testes locais.
BIOMETRIA_ENCRYPTION_KEY = env(
    "BIOMETRIA_ENCRYPTION_KEY", default="4Z9pump3EhI8f4gJKzC-9x6vT2s0y7wq1nL5bR8dMoA="
)

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
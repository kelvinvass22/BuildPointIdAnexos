"""Configuração WSGI -- usada pelo gunicorn no Render (ver render.yaml)."""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

application = get_wsgi_application()

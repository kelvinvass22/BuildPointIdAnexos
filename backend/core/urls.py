"""
URLs raiz do BuildPoint ID.

Cada app expõe seu próprio urls.py; aqui só compomos o prefixo /api/.
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from usuarios.views import LoginView

urlpatterns = [
    path("admin/", admin.site.urls),

    # Autenticação (login por CPF/CNPJ, ver usuarios/serializers.py)
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("api/usuarios/", include("usuarios.urls")),
    path("api/obras/", include("obras.urls")),
    path("api/biometria/", include("biometria.urls")),
    path("api/", include("ponto.urls")),  # /api/marcacoes/ (bate com o SQ01 do doc: POST /marcacoes)
    path("api/relatorios/", include("relatorios.urls")),

    # Documentação OpenAPI / Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
from django.urls import path

from . import views

app_name = "ponto"

urlpatterns = [
    # bate com o SQ01 da Etapa 3: POST /marcacoes
    path("marcacoes/", views.RegistrarPontoView.as_view(), name="registrar_ponto"),
    path("marcacoes/historico/", views.HistoricoMarcacoesView.as_view(), name="historico"),
]

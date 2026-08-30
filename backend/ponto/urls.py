from django.urls import path

from . import views

app_name = "ponto"

urlpatterns = [
    # bate com o SQ01 da Etapa 3: POST /marcacoes
    path("marcacoes/", views.RegistrarPontoView.as_view(), name="registrar_ponto"),
    path("marcacoes/contingencia/", views.RegistrarContingenciaView.as_view(), name="contingencia"),
    path("marcacoes/contingencia-papel/", views.RegistrarContingenciaPapelView.as_view(), name="contingencia_papel"),
    path("marcacoes/historico/", views.HistoricoMarcacoesView.as_view(), name="historico"),
    path("marcacoes/<uuid:pk>/recibo/", views.ReciboPontoView.as_view(), name="recibo"),
    path("marcacoes/<uuid:pk>/verificar-integridade/", views.VerificarIntegridadeView.as_view(), name="verificar_integridade"),
]

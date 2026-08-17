from django.urls import path

from . import views

app_name = "relatorios"

urlpatterns = [
    path("gerar/", views.GerarRelatorioView.as_view(), name="gerar"),
    path("", views.ListarRelatoriosView.as_view(), name="listar"),
]

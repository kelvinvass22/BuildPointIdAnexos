from django.urls import path

from . import views

app_name = "usuarios"

urlpatterns = [
    path("me/", views.MeView.as_view(), name="me"),
    path("operarios/", views.ListarOperariosView.as_view(), name="listar_operarios"),
    path("operarios/cadastrar/", views.CadastrarOperarioView.as_view(), name="cadastrar_operario"),
    path("gerentes/cadastrar/", views.CadastrarGerenteView.as_view(), name="cadastrar_gerente"),
]

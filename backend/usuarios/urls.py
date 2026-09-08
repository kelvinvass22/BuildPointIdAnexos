from django.urls import path

from . import views

app_name = "usuarios"

urlpatterns = [
    path("me/", views.MeView.as_view(), name="me"),
    path("operarios/", views.ListarOperariosView.as_view(), name="listar_operarios"),
    path("operarios/cadastrar/", views.CadastrarOperarioView.as_view(), name="cadastrar_operario"),
    path("operarios/<uuid:pk>/atualizar/", views.AtualizarOperarioView.as_view(), name="atualizar_operario"),
    path("operarios/<uuid:pk>/remover/", views.RemoverOperarioView.as_view(), name="remover_operario"),
    path("gerentes/cadastrar/", views.CadastrarGerenteView.as_view(), name="cadastrar_gerente"),
]

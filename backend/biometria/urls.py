from django.urls import path

from . import views

app_name = "biometria"

urlpatterns = [
    path("cadastrar/", views.CadastrarBiometriaView.as_view(), name="cadastrar_biometria"),
]

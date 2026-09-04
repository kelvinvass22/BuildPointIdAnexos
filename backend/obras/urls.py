from rest_framework.routers import DefaultRouter

from .views import EquipeViewSet, ObraViewSet

app_name = "obras"

router = DefaultRouter()
router.register("equipes", EquipeViewSet, basename="equipe")
router.register("", ObraViewSet, basename="obra")

urlpatterns = router.urls

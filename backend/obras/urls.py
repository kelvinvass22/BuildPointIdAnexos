from rest_framework.routers import DefaultRouter

from .views import ObraViewSet

app_name = "obras"

router = DefaultRouter()
router.register("", ObraViewSet, basename="obra")

urlpatterns = router.urls

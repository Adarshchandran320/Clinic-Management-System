from rest_framework.routers import DefaultRouter
from .views import (
    PatientViewSet,
    AppointmentViewSet,
    TokenViewSet,
    BillViewSet,
    PaymentViewSet,
)

router = DefaultRouter()

router.register(r"patients", PatientViewSet, basename="patient")
router.register(r"appointments", AppointmentViewSet, basename="appointment")
router.register(r"tokens", TokenViewSet, basename="token")
router.register(r"bills", BillViewSet, basename="bill")
router.register(r"payments", PaymentViewSet, basename="payment")

urlpatterns = router.urls
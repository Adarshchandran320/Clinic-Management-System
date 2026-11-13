from rest_framework.routers import DefaultRouter
from . import views
from receptionist.views import AppointmentViewSet

router = DefaultRouter()
router.register(r'doctors', views.DoctorViewSet)
router.register(r'consultations', views.ConsultationViewSet)
router.register(r'prescriptions', views.PrescriptionViewSet)
router.register(r'prescription-items', views.PrescriptionItemViewSet)
router.register(r'lab-prescriptions', views.LabPrescriptionViewSet)
router.register(r'queue', views.DoctorWaitingQueueViewSet, basename='doctor-queue')
router.register(r'appointments', AppointmentViewSet, basename='doctor-appointments')
router.register(r'lab-reports', views.DoctorLabReportViewSet, basename='doctor-lab-reports')

urlpatterns = router.urls
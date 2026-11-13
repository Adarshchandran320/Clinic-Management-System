from rest_framework.routers import DefaultRouter
from doctor import views
from apibackendapp.views import NotificationViewSet
from django.urls import path

router = DefaultRouter()
router.register(r'doctors', views.DoctorViewSet)
router.register(r'consultations', views.ConsultationViewSet)
router.register(r'prescriptions', views.PrescriptionViewSet)
router.register(r'prescription-items', views.PrescriptionItemViewSet)
router.register(r'lab-prescriptions', views.LabPrescriptionViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('notifications/unread-count/', NotificationViewSet.as_view({'get': 'unread_count'}), name='notification-unread-count'),
    path('notifications/<int:pk>/read/', NotificationViewSet.as_view({'post': 'mark_read'}), name='notification-mark-read'),
    path('notifications/read-all/', NotificationViewSet.as_view({'post': 'mark_read_all'}), name='notification-read-all'),
]
urlpatterns += router.urls
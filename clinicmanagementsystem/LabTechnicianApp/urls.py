from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LabReportViewSet, LabTestViewSet,LabPrescriptionViewSet


router = DefaultRouter()

router.register('lab-reports', LabReportViewSet, basename='lab-report')
router.register('reports', LabReportViewSet, basename='report')
router.register('lab-prescriptions', LabPrescriptionViewSet, basename='lab-prescription')

router.register('lab-tests', LabTestViewSet, basename='lab-test')


urlpatterns = [path('', include(router.urls)),]
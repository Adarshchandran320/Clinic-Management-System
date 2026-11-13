from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, RoleViewSet, DepartmentViewSet, StaffViewSet, DoctorViewSet, LabTestViewSet, MasterMedicineViewSet, AuditLogViewSet, DosageViewSet
from .views import (
    AdminLoginView,
    UserViewSet,
    RoleViewSet,
    DepartmentViewSet,
    StaffViewSet,
    DoctorViewSet,
    LabTestViewSet,
    MasterMedicineViewSet,
    AuditLogViewSet,
    AppointmentViewSet,
    PatientViewSet,
    DashboardView
)



router = DefaultRouter()

router.register('users', UserViewSet)
router.register('roles', RoleViewSet)
router.register('departments', DepartmentViewSet)
router.register('staff', StaffViewSet)
router.register('doctors', DoctorViewSet)
router.register('lab-tests', LabTestViewSet)
router.register('medicines', MasterMedicineViewSet)
router.register('audit-logs', AuditLogViewSet)
router.register('appointments', AppointmentViewSet)
router.register('patients', PatientViewSet)
router.register('dosages', DosageViewSet)


urlpatterns = [
    path('login/', AdminLoginView.as_view()),
    path('dashboard/', DashboardView.as_view()),
    path('', include(router.urls)),
]
from rest_framework import viewsets, filters
from apibackendapp.models import Doctor, Consultation, Prescription, PrescriptionItem, LabPrescription
from apibackendapp.permissions import (
    IsAdminUserOrReadOnly,
    IsDoctorUser,
    IsLabPrescriptionPermission,
)
from .serializers import (
    DoctorSerializer,
    ConsultationSerializer,
    PrescriptionSerializer,
    PrescriptionCreateSerializer,
    PrescriptionItemSerializer,
    LabPrescriptionSerializer,
)


class DoctorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUserOrReadOnly]
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['Name', 'Specialization']


class ConsultationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsDoctorUser]
    queryset = Consultation.objects.all()
    serializer_class = ConsultationSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['Diagnosis', 'Symptoms']

    def get_queryset(self):
        queryset = Consultation.objects.all()
        doctor_id = self.request.query_params.get('doctor_id')
        if doctor_id:
            queryset = queryset.filter(DoctorId=doctor_id)
        return queryset

    def perform_create(self, serializer):
        kwargs = {}
        doctor_profile = getattr(self.request.user, 'doctor_profile', None) or Doctor.objects.filter(UserId=self.request.user).first()
        if doctor_profile and not serializer.validated_data.get('DoctorId'):
            kwargs['DoctorId'] = doctor_profile
        instance = serializer.save(**kwargs)
        if instance.ConsultationStatus == 'Completed' and instance.AppointmentId:
            appointment = instance.AppointmentId
            appointment.AppointmentStatus = 'Completed'
            appointment.save(update_fields=['AppointmentStatus'])

    def perform_update(self, serializer):
        instance = serializer.save()
        # Auto-update appointment status when consultation is completed
        if instance.ConsultationStatus == 'Completed' and instance.AppointmentId:
            appointment = instance.AppointmentId
            appointment.AppointmentStatus = 'Completed'
            appointment.save(update_fields=['AppointmentStatus'])


class PrescriptionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsDoctorUser]
    queryset = Prescription.objects.all()
    filter_backends = [filters.SearchFilter]
    search_fields = ['Status']

    def get_serializer_class(self):
        if self.action == 'create':
            return PrescriptionCreateSerializer
        return PrescriptionSerializer

    def perform_create(self, serializer):
        prescription = serializer.save()
        from apibackendapp.notifications import notify_prescription_created
        notify_prescription_created(prescription, actor=self.request.user)


class PrescriptionItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsDoctorUser]
    queryset = PrescriptionItem.objects.all()
    serializer_class = PrescriptionItemSerializer


class LabPrescriptionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsLabPrescriptionPermission]
    queryset = LabPrescription.objects.all()
    serializer_class = LabPrescriptionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['Status', 'SampleType']

    def perform_create(self, serializer):
        kwargs = {}
        doctor_profile = getattr(self.request.user, 'doctor_profile', None) or Doctor.objects.filter(UserId=self.request.user).first()
        if doctor_profile and not serializer.validated_data.get('DoctorId'):
            kwargs['DoctorId'] = doctor_profile
        lab_order = serializer.save(**kwargs)
        from apibackendapp.notifications import notify_lab_order_created
        notify_lab_order_created(lab_order, actor=self.request.user)



class DoctorWaitingQueueViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsDoctorUser]

    def get_serializer_class(self):
        from receptionist.serializers import AppointmentSerializer
        return AppointmentSerializer

    def get_queryset(self):
        from apibackendapp.models import Appointment
        user = self.request.user
        doctor_profile = getattr(user, 'doctor_profile', None) or Doctor.objects.filter(UserId=user).first()
        if doctor_profile:
            return (
                Appointment.objects.filter(
                    DoctorId=doctor_profile,
                    AppointmentStatus='Waiting'
                )
                .select_related('PatientId', 'DoctorId', 'DepartmentId')
                .order_by('AppointmentDateTime')
            )
        return Appointment.objects.none()


class DoctorLabReportViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsDoctorUser]

    def get_serializer_class(self):
        from LabTechnicianApp.serializers import LabReportSerializer
        return LabReportSerializer

    def get_queryset(self):
        from apibackendapp.models import LabReport
        qs = LabReport.objects.select_related(
            "LabPrescriptionId",
            "LabPrescriptionId__PatientId",
            "LabPrescriptionId__DoctorId",
            "LabPrescriptionId__LabTestId",
            "LabTechnician",
        ).all().order_by("-ReportDate")
        order_id = self.request.query_params.get("order_id") or self.request.query_params.get("LabPrescriptionId")
        if order_id:
            qs = qs.filter(LabPrescriptionId=order_id)
        patient_id = self.request.query_params.get("patient_id")
        if patient_id:
            qs = qs.filter(LabPrescriptionId__PatientId=patient_id)
        return qs

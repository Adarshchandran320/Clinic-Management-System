from rest_framework import viewsets
from apibackendapp.models import LabReport, LabTest, LabPrescription, Staff, Bill
from django.utils import timezone
from apibackendapp.permissions import (
    IsLabTechnicianUser,
    IsAdminUserOrReadOnly,
    IsLabPrescriptionPermission,
)
from .serializers import LabReportSerializer, LabTestSerializer, LabPrescriptionSerializer


class LabReportViewSet(viewsets.ModelViewSet):
    serializer_class = LabReportSerializer
    permission_classes = [IsLabTechnicianUser]

    def get_queryset(self):
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

    def perform_create(self, serializer):
        kwargs = {}
        user = getattr(self.request, "user", None)
        staff = getattr(user, "staff_profile", None) or (Staff.objects.filter(UserId=user).first() if user else None)
        if staff and not serializer.validated_data.get("LabTechnician"):
            kwargs["LabTechnician"] = staff
        report = serializer.save(**kwargs)
        if report.LabPrescriptionId:
            order = report.LabPrescriptionId
            order.Status = "Completed"
            order.save(update_fields=["Status"])

            # Auto-generate Lab Bill so it appears in Receptionist's Billing & Payments
            patient = order.PatientId
            cost = order.LabTestId.TestCost if order.LabTestId else 0
            if patient and cost:
                bill_type = f"Lab #{order.pk}"
                if not Bill.objects.filter(BillType__iexact=bill_type).exists():
                    Bill.objects.create(
                        PatientId=patient,
                        BillDate=timezone.now().date(),
                        Amount=cost,
                        BillStatus="Pending",
                        BillType=bill_type,
                    )
        from apibackendapp.notifications import notify_lab_report_saved
        notify_lab_report_saved(report, actor=self.request.user)


class LabTestViewSet(viewsets.ModelViewSet):
    queryset = LabTest.objects.all()
    serializer_class = LabTestSerializer
    permission_classes = [IsAdminUserOrReadOnly]


class LabPrescriptionViewSet(viewsets.ModelViewSet):
    queryset = LabPrescription.objects.all()
    serializer_class = LabPrescriptionSerializer
    permission_classes = [IsLabPrescriptionPermission]
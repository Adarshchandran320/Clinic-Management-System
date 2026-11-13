from rest_framework import viewsets, filters
from django.db.models import Sum
from apibackendapp.models import (
    Patient,
    Appointment,
    Token,
    Bill,
    Payment,
    Staff,
    Doctor,
)
from apibackendapp.permissions import (
    IsReceptionistUser,
    IsBillPermission,
    get_user_role,
)

from .serializers import (
    PatientSerializer,
    AppointmentSerializer,
    TokenSerializer,
    BillSerializer,
    PaymentSerializer,
)


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by("PatientId")
    serializer_class = PatientSerializer
    permission_classes = [IsReceptionistUser]

    filter_backends = [filters.SearchFilter]
    search_fields = [
        "Name",
        "PatientId",
        "PhoneNumber",
        "Address",
    ]


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsReceptionistUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ["PatientId__Name", "DoctorId__Name", "AppointmentStatus"]

    def get_queryset(self):
        user = getattr(self.request, "user", None)
        role = get_user_role(user)
        qs = (
            Appointment.objects
            .select_related(
                "PatientId",
                "ReceptionistId",
                "DoctorId",
                "DepartmentId",
            )
            .all()
            .order_by("-AppointmentDateTime")
        )
        if role == "doctor":
            doc = getattr(user, "doctor_profile", None) or Doctor.objects.filter(UserId=user).first()
            if doc:
                qs = qs.filter(DoctorId=doc)
        status_param = self.request.query_params.get("status") or self.request.query_params.get("AppointmentStatus")
        if status_param:
            qs = qs.filter(AppointmentStatus__iexact=status_param)
        return qs

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)
        staff = getattr(user, "staff_profile", None) or (Staff.objects.filter(UserId=user).first() if user else None)
        if not staff:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {"ReceptionistId": "Authenticated user has no linked staff profile. Cannot book appointment."}
            )
        appointment = serializer.save(ReceptionistId=staff)
        from apibackendapp.notifications import notify_appointment_created
        notify_appointment_created(appointment, actor=self.request.user)

    def perform_update(self, serializer):
        prev_status = getattr(self.get_object(), "AppointmentStatus", None)
        appointment = serializer.save()
        if prev_status != "Cancelled" and appointment.AppointmentStatus == "Cancelled":
            from apibackendapp.notifications import notify_appointment_cancelled
            notify_appointment_cancelled(appointment, actor=self.request.user)


class TokenViewSet(viewsets.ModelViewSet):
    serializer_class = TokenSerializer
    permission_classes = [IsReceptionistUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ["PatientId__Name", "DoctorId__Name"]

    def get_queryset(self):
        user = getattr(self.request, "user", None)
        role = get_user_role(user)
        qs = (
            Token.objects
            .select_related(
                "AppointmentId",
                "PatientId",
                "DoctorId",
            )
            .all()
            .order_by("-TokenDate")
        )
        if role == "doctor":
            doc = getattr(user, "doctor_profile", None) or Doctor.objects.filter(UserId=user).first()
            if doc:
                qs = qs.filter(DoctorId=doc)
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(AppointmentId__AppointmentStatus__iexact=status_param)
        return qs

    def perform_create(self, serializer):
        token = serializer.save()
        if token.AppointmentId:
            token.AppointmentId.AppointmentStatus = "Waiting"
            token.AppointmentId.save(update_fields=["AppointmentStatus"])
        from apibackendapp.notifications import notify_token_created
        notify_token_created(token, actor=self.request.user)


class BillViewSet(viewsets.ModelViewSet):
    queryset = (
        Bill.objects
        .select_related("PatientId")
        .all()
        .order_by("-BillDate")
    )

    serializer_class = BillSerializer
    permission_classes = [IsBillPermission]


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = (
        Payment.objects
        .select_related("BillId", "BillId__PatientId")
        .all()
        .order_by("-PaymentDate")
    )

    serializer_class = PaymentSerializer
    permission_classes = [IsReceptionistUser]

    def perform_create(self, serializer):
        payment = serializer.save()
        bill = payment.BillId
        total_paid = Payment.objects.filter(BillId=bill).aggregate(total=Sum("Amount"))["total"] or 0
        if total_paid >= bill.Amount:
            bill.BillStatus = "Paid"
            bill.save(update_fields=["BillStatus"])
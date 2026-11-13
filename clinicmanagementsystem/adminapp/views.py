from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from django.utils import timezone

from apibackendapp.models import (
    User,
    Role,
    Department,
    Staff,
    Doctor,
    LabTest,
    MasterMedicine,
    AuditLog,
    Appointment,
    Patient,
    Dosage,
)

from .serializers import (
    UserSerializer,
    RoleSerializer,
    DepartmentSerializer,
    StaffSerializer,
    DoctorSerializer,
    LabTestSerializer,
    MasterMedicineSerializer,
    AuditLogSerializer,
    DosageSerializer,
)

from .authentication import (
    AdminJWTAuthentication,
    IsAdminUser
)


# -------------------------
# COMMON ADMIN VIEWSET
# -------------------------

class AdminModelViewSet(viewsets.ModelViewSet):

    authentication_classes = [
        AdminJWTAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def create(self, request, *args, **kwargs):

        response = super().create(request, *args, **kwargs)

        if response.status_code == status.HTTP_201_CREATED:

            AuditLog.objects.create(
                UserId=request.user,
                ActionType="CREATE",
                TableAffected=self.queryset.model.__name__,
                RecordId=response.data.get(
                    self.queryset.model._meta.pk.name
                ),
                Details="Record created by administrator."
            )

        return response

    def update(self, request, *args, **kwargs):

        response = super().update(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:

            AuditLog.objects.create(
                UserId=request.user,
                ActionType="UPDATE",
                TableAffected=self.queryset.model.__name__,
                RecordId=self.get_object().pk,
                Details="Record updated by administrator."
            )

        return response

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        record_id = instance.pk

        table_name = self.queryset.model.__name__

        response = super().destroy(request, *args, **kwargs)

        if response.status_code == status.HTTP_204_NO_CONTENT:

            AuditLog.objects.create(
                UserId=request.user,
                ActionType="DELETE",
                TableAffected=table_name,
                RecordId=record_id,
                Details="Record deleted by administrator."
            )

        return response


# -------------------------
# ADMIN LOGIN
# -------------------------

# -------------------------
# ADMIN LOGIN
# -------------------------

class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        username = request.data.get("Username") or request.data.get("username")
        password = request.data.get("Password") or request.data.get("password")

        if not username or not password:
            return Response(
                {
                    "error": "Username and Password are required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.select_related('RoleId').get(Username=str(username).strip())

        except User.DoesNotExist:
            return Response(
                {
                    "error": "Invalid username or password."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.check_password(password):
            return Response(
                {
                    "error": "Invalid username or password."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.isActive:
            return Response(
                {
                    "error": "User is inactive."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if str(user.RoleId.RoleName).strip().lower() != "admin":
            return Response(
                {
                    "error": "Admin access required."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # Create login audit log
        try:
            AuditLog.objects.create(
                UserId=user,
                ActionType="LOGIN",
                TableAffected="User",
                RecordId=user.UserId,
                Details="Administrator logged in successfully."
            )
        except Exception:
            pass

        refresh = RefreshToken()
        refresh["user_id"] = user.UserId
        refresh["username"] = user.Username
        refresh["role"] = user.RoleId.RoleName

        access_token = refresh.access_token
        access_token["user_id"] = user.UserId
        access_token["username"] = user.Username
        access_token["role"] = user.RoleId.RoleName

        return Response(
            {
                "message": "Admin login successful.",
                "access": str(access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.UserId,
                    "user_id": user.UserId,
                    "username": user.Username,
                    "role": user.RoleId.RoleName,
                    "role_id": user.RoleId.RoleId,
                }
            },
            status=status.HTTP_200_OK
        )


# -------------------------
# USER
# -------------------------

# -------------------------
# USER
# -------------------------

class UserViewSet(AdminModelViewSet):

    queryset = User.objects.all()
    serializer_class = UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        from apibackendapp.notifications import notify_user_created
        notify_user_created(user, actor=getattr(self.request, "user", None))

    def perform_update(self, serializer):
        prev_active = getattr(self.get_object(), "isActive", True)
        user = serializer.save()
        if prev_active and not user.isActive:
            from apibackendapp.notifications import notify_user_deactivated
            notify_user_deactivated(user, actor=getattr(self.request, "user", None))

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):

        user = self.get_object()

        user.isActive = False
        user.save()

        AuditLog.objects.create(
            UserId=request.user,
            ActionType="DEACTIVATE",
            TableAffected="User",
            RecordId=user.UserId,
            Details="User account deactivated by administrator."
        )

        from apibackendapp.notifications import notify_user_deactivated
        notify_user_deactivated(user, actor=request.user)

        return Response(
            {
                "message": "User deactivated successfully.",
                "UserId": user.UserId,
                "Username": user.Username,
                "isActive": user.isActive
            }
        )

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):

        user = self.get_object()

        user.isActive = True
        user.save()

        AuditLog.objects.create(
            UserId=request.user,
            ActionType="ACTIVATE",
            TableAffected="User",
            RecordId=user.UserId,
            Details="User account activated by administrator."
        )

        return Response(
            {
                "message": "User activated successfully.",
                "UserId": user.UserId,
                "Username": user.Username,
                "isActive": user.isActive
            }
        )


# -------------------------
# ROLE
# -------------------------

class RoleViewSet(AdminModelViewSet):

    queryset = Role.objects.all()
    serializer_class = RoleSerializer


# -------------------------
# DEPARTMENT
# -------------------------

class DepartmentViewSet(AdminModelViewSet):

    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):

        department = self.get_object()

        department.isActive = False
        department.save()

        AuditLog.objects.create(
            UserId=request.user,
            ActionType="DEACTIVATE",
            TableAffected="Department",
            RecordId=department.DepartmentId,
            Details="Department deactivated by administrator."
        )
        return Response(
            {
                "message": "Department deactivated successfully.",
                "DepartmentId": department.DepartmentId,
                "DepartmentName": department.DepartmentName,
                "isActive": department.isActive
            }
        )

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):

        department = self.get_object()

        department.isActive = True
        department.save()
        AuditLog.objects.create(
            UserId=request.user,
            ActionType="ACTIVATE",
            TableAffected="Department",
            RecordId=department.DepartmentId,
            Details="Department activated by administrator."
        )
        return Response(
            {
                "message": "Department activated successfully.",
                "DepartmentId": department.DepartmentId,
                "DepartmentName": department.DepartmentName,
                "isActive": department.isActive
            }
        )

# -------------------------
# STAFF
# -------------------------

class StaffViewSet(AdminModelViewSet):

    queryset = Staff.objects.all()
    serializer_class = StaffSerializer


# -------------------------
# DOCTOR
# -------------------------

class DoctorViewSet(AdminModelViewSet):

    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):

        doctor = self.get_object()

        doctor.isActive = False
        doctor.save()

        AuditLog.objects.create(
            UserId=request.user,
            ActionType="DEACTIVATE",
            TableAffected="Doctor",
            RecordId=doctor.DoctorId,
            Details="Doctor account deactivated by administrator."
        )

        return Response({
            "message": "Doctor deactivated successfully.",
            "DoctorId": doctor.DoctorId,
            "Name": doctor.Name,
            "isActive": doctor.isActive
        })

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):

        doctor = self.get_object()

        doctor.isActive = True
        doctor.save()

        AuditLog.objects.create(
            UserId=request.user,
            ActionType="ACTIVATE",
            TableAffected="Doctor",
            RecordId=doctor.DoctorId,
            Details="Doctor account activated by administrator."
        )

        return Response({
            "message": "Doctor activated successfully.",
            "DoctorId": doctor.DoctorId,
            "Name": doctor.Name,
            "isActive": doctor.isActive
        })


# -------------------------
# LAB TEST
# -------------------------

class LabTestViewSet(AdminModelViewSet):

    queryset = LabTest.objects.all()
    serializer_class = LabTestSerializer

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):

        lab_test = self.get_object()

        lab_test.isActive = False
        lab_test.save()

        AuditLog.objects.create(
            UserId=request.user,
            ActionType="DEACTIVATE",
            TableAffected="LabTest",
            RecordId=lab_test.LabtestId,
            Details="Lab test deactivated by administrator."
        )

        return Response({
            "message": "Lab test deactivated successfully.",
            "LabtestId": lab_test.LabtestId,
            "TestName": lab_test.TestName,
            "isActive": lab_test.isActive
        })

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):

        lab_test = self.get_object()

        lab_test.isActive = True
        lab_test.save()

        AuditLog.objects.create(
            UserId=request.user,
            ActionType="ACTIVATE",
            TableAffected="LabTest",
            RecordId=lab_test.LabtestId,
            Details="Lab test activated by administrator."
        )

        return Response({
            "message": "Lab test activated successfully.",
            "LabtestId": lab_test.LabtestId,
            "TestName": lab_test.TestName,
            "isActive": lab_test.isActive
        })


# -------------------------
# MASTER MEDICINE
# -------------------------

class MasterMedicineViewSet(AdminModelViewSet):

    queryset = MasterMedicine.objects.all()
    serializer_class = MasterMedicineSerializer

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):

        medicine = self.get_object()

        medicine.isActive = False
        medicine.save()

        AuditLog.objects.create(
            UserId=request.user,
            ActionType="DEACTIVATE",
            TableAffected="MasterMedicine",
            RecordId=medicine.MedicineId,
            Details="Medicine deactivated by administrator."
        )

        return Response({
            "message": "Medicine deactivated successfully.",
            "MedicineId": medicine.MedicineId,
            "MedicineName": medicine.MedicineName,
            "isActive": medicine.isActive
        })

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):

        medicine = self.get_object()

        medicine.isActive = True
        medicine.save()

        AuditLog.objects.create(
            UserId=request.user,
            ActionType="ACTIVATE",
            TableAffected="MasterMedicine",
            RecordId=medicine.MedicineId,
            Details="Medicine activated by administrator."
        )

        return Response({
            "message": "Medicine activated successfully.",
            "MedicineId": medicine.MedicineId,
            "MedicineName": medicine.MedicineName,
            "isActive": medicine.isActive
        })


# -------------------------
# AUDIT LOG
# -------------------------

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = AuditLog.objects.all().order_by("-action_time")

    serializer_class = AuditLogSerializer

    authentication_classes = [
        AdminJWTAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def get_queryset(self):

        queryset = AuditLog.objects.all().order_by("-action_time")

        action_type = self.request.query_params.get("ActionType")
        user_id = self.request.query_params.get("UserId")

        if action_type:
            queryset = queryset.filter(ActionType=action_type)

        if user_id:
            queryset = queryset.filter(UserId_id=user_id)

        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(action_time__date__gte=start_date)

        if end_date:
            queryset = queryset.filter(action_time__date__lte=end_date)

        return queryset

# -------------------------
# APPOINTMENT MONITORING
# -------------------------

class AppointmentViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = Appointment.objects.all().order_by("-AppointmentDateTime")
    serializer_class = None

    authentication_classes = [
        AdminJWTAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def list(self, request, *args, **kwargs):

        appointments = Appointment.objects.all().order_by("-AppointmentDateTime")

        appointment_date = request.query_params.get("date")
        department_id = request.query_params.get("DepartmentId")
        doctor_id = request.query_params.get("DoctorId")
        appointment_status = request.query_params.get("AppointmentStatus")

        if appointment_date:
            appointments = appointments.filter(
                AppointmentDateTime__date=appointment_date
            )

        if department_id:
            appointments = appointments.filter(
                DepartmentId_id=department_id
            )

        if doctor_id:
            appointments = appointments.filter(
                DoctorId_id=doctor_id
            )

        if appointment_status:
            appointments = appointments.filter(
                AppointmentStatus=appointment_status
            )

        data = []

        for appointment in appointments:

            data.append({
                "AppointmentId": appointment.AppointmentId,
                "PatientId": appointment.PatientId.PatientId,
                "PatientName": appointment.PatientId.Name,
                "DoctorId": appointment.DoctorId.DoctorId,
                "DoctorName": appointment.DoctorId.Name,
                "DepartmentId": appointment.DepartmentId.DepartmentId,
                "DepartmentName": appointment.DepartmentId.DepartmentName,
                "AppointmentStatus": appointment.AppointmentStatus,
                "AppointmentDateTime": appointment.AppointmentDateTime
            })

        return Response(data)

# -------------------------
# PATIENT MONITORING
# -------------------------

class PatientViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = Patient.objects.all().order_by("Name")
    serializer_class = None

    authentication_classes = [
        AdminJWTAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def list(self, request, *args, **kwargs):

        patients = Patient.objects.all().order_by("Name")

        name = request.query_params.get("Name")
        phone = request.query_params.get("PhoneNumber")

        if name:
            patients = patients.filter(Name__icontains=name)

        if phone:
            patients = patients.filter(PhoneNumber__icontains=phone)

        data = []

        for patient in patients:

            data.append({
                "PatientId": patient.PatientId,
                "Name": patient.Name,
                "Gender": patient.Gender,
                "DOB": patient.DOB,
                "PhoneNumber": patient.PhoneNumber,
                "Address": patient.Address,
                "BloodGroup": patient.BloodGroup,
                "Weight": patient.Weight,
                "Height": patient.Height
            })

        return Response(data)

# -------------------------
# ADMIN DASHBOARD
# -------------------------

class DashboardView(APIView):

    authentication_classes = [
        AdminJWTAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def get(self, request):

        today = timezone.now().date()

        total_users = User.objects.count()
        active_users = User.objects.filter(isActive=True).count()
        inactive_users = User.objects.filter(isActive=False).count()

        appointments_today = Appointment.objects.filter(
            AppointmentDateTime__date=today
        ).count()

        waiting_appointments = Appointment.objects.filter(
            AppointmentStatus="Waiting"
        ).count()

        completed_appointments = Appointment.objects.filter(
            AppointmentStatus="Completed"
        ).count()

        patients_registered = Patient.objects.count()

        recent_audit_activity = AuditLog.objects.all().order_by(
            "-action_time"
        )[:5]

        audit_data = []

        for audit in recent_audit_activity:

            audit_data.append({
                "AuditId": audit.AuditId,
                "ActionType": audit.ActionType,
                "TableAffected": audit.TableAffected,
                "RecordId": audit.RecordId,
                "Details": audit.Details,
                "action_time": audit.action_time
            })

        return Response({
            "users": {
                "total": total_users,
                "active": active_users,
                "inactive": inactive_users
            },
            "appointments": {
                "today": appointments_today,
                "waiting": waiting_appointments,
                "completed": completed_appointments
            },
            "patients_registered": patients_registered,
            "recent_audit_activity": audit_data
        })


# -------------------------
# DOSAGE
# -------------------------

class DosageViewSet(AdminModelViewSet):

    queryset = Dosage.objects.all()
    serializer_class = DosageSerializer
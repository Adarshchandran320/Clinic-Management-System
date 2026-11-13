from rest_framework import serializers
from datetime import date, datetime
import re
from django.utils import timezone
from apibackendapp.models import (
    Patient,
    Appointment,
    Token,
    Bill,
    Payment,
    Doctor,
    Department,
    Staff,
)


# ---------- Validation helper functions ----------

def name_validation(value):
    value = str(value).strip()
    if len(value) < 3 or not re.match(r"^[A-Za-z. ]+$", value):
        raise serializers.ValidationError(
            "Name must be at least 3 characters and contain only letters and spaces."
        )
    return value


def phone_validation(value):
    value = str(value).strip()
    digits = re.sub(r"\D", "", value)
    if not (7 <= len(digits) <= 15):
        raise serializers.ValidationError("Phone number must be between 7 and 15 digits.")
    return digits


def dob_validation(value):
    today = date.today()
    if value > today:
        raise serializers.ValidationError("Date of birth cannot be in the future.")
    age = today.year - value.year
    if (today.month, today.day) < (value.month, value.day):
        age -= 1
    if age > 100:
        raise serializers.ValidationError("Patient age cannot exceed 100 years.")
    return value


# ---------- Serializers ----------

class PatientSerializer(serializers.ModelSerializer):
    Name = serializers.CharField(max_length=100, validators=[name_validation])
    PhoneNumber = serializers.CharField(max_length=15, validators=[phone_validation])
    DOB = serializers.DateField(validators=[dob_validation])
    Weight = serializers.FloatField()
    Height = serializers.FloatField()
    BloodGroup = serializers.CharField(max_length=10)
    Address = serializers.CharField(max_length=100)
    Gender = serializers.CharField(max_length=20)

    class Meta:
        model = Patient
        fields = [
            "PatientId",
            "Name",
            "Gender",
            "DOB",
            "PhoneNumber",
            "Address",
            "BloodGroup",
            "Weight",
            "Height",
        ]
        read_only_fields = ["PatientId"]

    def to_internal_value(self, data):
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)

        # Normalize frontend lowercase keys without setting defaults
        if "name" in mutable and "Name" not in mutable:
            mutable["Name"] = mutable["name"]
        if "gender" in mutable and "Gender" not in mutable:
            mutable["Gender"] = mutable["gender"]
        if "phone" in mutable and "PhoneNumber" not in mutable:
            mutable["PhoneNumber"] = mutable["phone"]
        if "phoneNumber" in mutable and "PhoneNumber" not in mutable:
            mutable["PhoneNumber"] = mutable["phoneNumber"]
        if "address" in mutable and "Address" not in mutable:
            mutable["Address"] = mutable["address"]
        if "blood_group" in mutable and "BloodGroup" not in mutable:
            mutable["BloodGroup"] = mutable["blood_group"]
        if "bloodGroup" in mutable and "BloodGroup" not in mutable:
            mutable["BloodGroup"] = mutable["bloodGroup"]
        if "dob" in mutable and "DOB" not in mutable:
            mutable["DOB"] = mutable["dob"]
        if "weight" in mutable and "Weight" not in mutable:
            mutable["Weight"] = mutable["weight"]
        if "height" in mutable and "Height" not in mutable:
            mutable["Height"] = mutable["height"]

        return super().to_internal_value(mutable)

    def validate(self, data):
        weight = data.get("Weight")
        height = data.get("Height")

        if weight is not None and weight <= 0:
            raise serializers.ValidationError({"Weight": "Weight must be greater than 0."})
        if height is not None and height <= 0:
            raise serializers.ValidationError({"Height": "Height must be greater than 0."})
        return data

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret["id"] = instance.PatientId
        ret["name"] = instance.Name
        ret["full_name"] = instance.Name
        ret["gender"] = instance.Gender
        ret["phone"] = instance.PhoneNumber
        ret["address"] = instance.Address
        ret["blood_group"] = instance.BloodGroup
        if instance.DOB:
            today = date.today()
            age = today.year - instance.DOB.year - ((today.month, today.day) < (instance.DOB.month, instance.DOB.day))
            ret["age"] = age
            ret["dob"] = instance.DOB.strftime("%Y-%m-%d")
        else:
            ret["age"] = "-"
        return ret


class AppointmentSerializer(serializers.ModelSerializer):
    ReceptionistId = serializers.PrimaryKeyRelatedField(
        queryset=Staff.objects.all(), required=False
    )

    class Meta:
        model = Appointment
        fields = [
            "AppointmentId",
            "PatientId",
            "ReceptionistId",
            "DoctorId",
            "DepartmentId",
            "AppointmentStatus",
            "AppointmentDateTime",
        ]
        read_only_fields = ["AppointmentId"]

    def to_internal_value(self, data):
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)

        # Support frontend lowercase keys
        if "patient" in mutable and "PatientId" not in mutable:
            mutable["PatientId"] = mutable["patient"]
        if "patientId" in mutable and "PatientId" not in mutable:
            mutable["PatientId"] = mutable["patientId"]
        if "doctor" in mutable and "DoctorId" not in mutable:
            mutable["DoctorId"] = mutable["doctor"]
        if "doctorId" in mutable and "DoctorId" not in mutable:
            mutable["DoctorId"] = mutable["doctorId"]
        if "department" in mutable and "DepartmentId" not in mutable:
            mutable["DepartmentId"] = mutable["department"]
        if "departmentId" in mutable and "DepartmentId" not in mutable:
            mutable["DepartmentId"] = mutable["departmentId"]
        if "receptionist" in mutable and "ReceptionistId" not in mutable:
            mutable["ReceptionistId"] = mutable["receptionist"]
        if "receptionistId" in mutable and "ReceptionistId" not in mutable:
            mutable["ReceptionistId"] = mutable["receptionistId"]
        if "status" in mutable and "AppointmentStatus" not in mutable:
            mutable["AppointmentStatus"] = mutable["status"]
        if "appointmentStatus" in mutable and "AppointmentStatus" not in mutable:
            mutable["AppointmentStatus"] = mutable["appointmentStatus"]
        if "appointmentDateTime" in mutable and "AppointmentDateTime" not in mutable:
            mutable["AppointmentDateTime"] = mutable["appointmentDateTime"]

        # If ReceptionistId is not provided, populate from request user staff profile (never fallback to first())
        if not mutable.get("ReceptionistId"):
            request = self.context.get("request")
            if request and getattr(request.user, "staff_profile", None):
                mutable["ReceptionistId"] = request.user.staff_profile.StaffId

        # Parse date and time into AppointmentDateTime if separate
        if "AppointmentDateTime" not in mutable:
            appt_date = mutable.get("appointment_date") or mutable.get("date")
            appt_time = mutable.get("appointment_time") or mutable.get("time") or "09:00"
            if appt_date:
                try:
                    if len(str(appt_time).split(":")) == 2:
                        appt_time = f"{appt_time}:00"
                    mutable["AppointmentDateTime"] = f"{appt_date} {appt_time}"
                except Exception:
                    pass

        return super().to_internal_value(mutable)

    def validate(self, data):
        doctor = data.get("DoctorId")
        department = data.get("DepartmentId")

        # Reject if doctor does not belong to the selected department
        if doctor and department and doctor.DepartmentId_id != department.DepartmentId:
            raise serializers.ValidationError(
                {"DepartmentId": "Selected doctor does not belong to the chosen department."}
            )

        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        staff = getattr(user, "staff_profile", None) or (Staff.objects.filter(UserId=user).first() if user else None)
        if not staff:
            raise serializers.ValidationError(
                {"ReceptionistId": "Authenticated user has no linked staff profile. Cannot book appointment."}
            )
        data["ReceptionistId"] = staff

        return data

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret["id"] = instance.AppointmentId
        ret["patient_name"] = instance.PatientId.Name if instance.PatientId else ""
        ret["doctor_name"] = f"Dr. {instance.DoctorId.Name}" if instance.DoctorId else ""
        ret["department_name"] = instance.DepartmentId.DepartmentName if instance.DepartmentId else ""
        ret["status"] = instance.AppointmentStatus
        if instance.AppointmentDateTime:
            ret["appointment_date"] = instance.AppointmentDateTime.strftime("%Y-%m-%d")
            ret["appointment_time"] = instance.AppointmentDateTime.strftime("%H:%M")
            ret["date"] = ret["appointment_date"]
            ret["time"] = ret["appointment_time"]
        return ret


class TokenSerializer(serializers.ModelSerializer):
    AppointmentId = serializers.PrimaryKeyRelatedField(queryset=Appointment.objects.all())
    PatientId = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False)
    DoctorId = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all(), required=False)
    TokenDate = serializers.DateTimeField(required=False)

    class Meta:
        model = Token
        fields = [
            "TokenNo",
            "AppointmentId",
            "PatientId",
            "DoctorId",
            "TokenDate",
        ]
        read_only_fields = ["TokenNo"]

    def to_internal_value(self, data):
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)

        if "appointment" in mutable and "AppointmentId" not in mutable:
            mutable["AppointmentId"] = mutable["appointment"]
        if "appointmentId" in mutable and "AppointmentId" not in mutable:
            mutable["AppointmentId"] = mutable["appointmentId"]
        if "patient" in mutable and "PatientId" not in mutable:
            mutable["PatientId"] = mutable["patient"]
        if "patientId" in mutable and "PatientId" not in mutable:
            mutable["PatientId"] = mutable["patientId"]
        if "doctor" in mutable and "DoctorId" not in mutable:
            mutable["DoctorId"] = mutable["doctor"]
        if "doctorId" in mutable and "DoctorId" not in mutable:
            mutable["DoctorId"] = mutable["doctorId"]
        if "tokenDate" in mutable and "TokenDate" not in mutable:
            mutable["TokenDate"] = mutable["tokenDate"]
        if "token_date" in mutable and "TokenDate" not in mutable:
            mutable["TokenDate"] = mutable["token_date"]

        # Derive PatientId and DoctorId from Appointment if missing
        appt_id = mutable.get("AppointmentId")
        if appt_id:
            try:
                appt = Appointment.objects.get(pk=appt_id)
                if not mutable.get("PatientId"):
                    mutable["PatientId"] = appt.PatientId_id
                if not mutable.get("DoctorId"):
                    mutable["DoctorId"] = appt.DoctorId_id
            except Exception:
                pass

        if "TokenDate" not in mutable:
            mutable["TokenDate"] = timezone.now()

        return super().to_internal_value(mutable)

    def validate(self, data):
        appt = data.get("AppointmentId")
        patient = data.get("PatientId")
        doctor = data.get("DoctorId")

        if appt:
            if not patient:
                patient = appt.PatientId
                data["PatientId"] = patient
            elif appt.PatientId_id != patient.PatientId:
                raise serializers.ValidationError(
                    {"PatientId": "Token patient does not match the appointment patient."}
                )

            if not doctor:
                doctor = appt.DoctorId
                data["DoctorId"] = doctor
            elif appt.DoctorId_id != doctor.DoctorId:
                raise serializers.ValidationError(
                    {"DoctorId": "Token doctor does not match the appointment doctor."}
                )

        if not data.get("TokenDate"):
            data["TokenDate"] = timezone.now()

        return data

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret["id"] = instance.TokenNo
        ret["token_number"] = instance.TokenNo
        ret["token_no"] = instance.TokenNo
        ret["appointment"] = instance.AppointmentId_id
        ret["appointment_id"] = instance.AppointmentId_id
        ret["patient_name"] = instance.PatientId.Name if instance.PatientId else ""
        ret["doctor_name"] = f"Dr. {instance.DoctorId.Name}" if instance.DoctorId else ""
        ret["status"] = getattr(instance.AppointmentId, "AppointmentStatus", "Waiting")
        if instance.TokenDate:
            ret["date"] = instance.TokenDate.strftime("%Y-%m-%d %H:%M")
        return ret


class BillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = [
            "BillId",
            "PatientId",
            "BillDate",
            "Amount",
            "BillStatus",
            "BillType",
        ]
        read_only_fields = ["BillId"]

    def to_internal_value(self, data):
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)
        if "patient" in mutable and "PatientId" not in mutable:
            mutable["PatientId"] = mutable["patient"]
        if "patientId" in mutable and "PatientId" not in mutable:
            mutable["PatientId"] = mutable["patientId"]
        if "amount" in mutable and "Amount" not in mutable:
            mutable["Amount"] = mutable["amount"]
        if "status" in mutable and "BillStatus" not in mutable:
            mutable["BillStatus"] = mutable["status"]
        if "billStatus" in mutable and "BillStatus" not in mutable:
            mutable["BillStatus"] = mutable["billStatus"]
        if "bill_date" in mutable and "BillDate" not in mutable:
            mutable["BillDate"] = mutable["bill_date"]
        if "billDate" in mutable and "BillDate" not in mutable:
            mutable["BillDate"] = mutable["billDate"]
        if "bill_type" in mutable and "BillType" not in mutable:
            mutable["BillType"] = mutable["bill_type"]
        if "billType" in mutable and "BillType" not in mutable:
            mutable["BillType"] = mutable["billType"]

        return super().to_internal_value(mutable)

    def validate_Amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Bill amount must be greater than 0.")
        return value

    def validate(self, data):
        bill_type = str(data.get("BillType", "")).strip()
        if bill_type.lower().startswith("lab #"):
            qs = Bill.objects.filter(BillType__iexact=bill_type)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"BillType": f"A bill for {bill_type} already exists."})
        return data

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret["id"] = instance.BillId
        ret["patient_name"] = instance.PatientId.Name if instance.PatientId else ""
        ret["total_amount"] = float(instance.Amount)
        ret["amount"] = float(instance.Amount)
        ret["status"] = instance.BillStatus
        ret["is_paid"] = instance.BillStatus.lower() == "paid"
        return ret


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "PaymentId",
            "BillId",
            "Amount",
            "PaymentMethod",
            "PaymentDate",
            "PaymentStatus",
        ]
        read_only_fields = ["PaymentId"]

    def to_internal_value(self, data):
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)
        if "bill" in mutable and "BillId" not in mutable:
            mutable["BillId"] = mutable["bill"]
        if "billId" in mutable and "BillId" not in mutable:
            mutable["BillId"] = mutable["billId"]
        if "amount" in mutable and "Amount" not in mutable:
            mutable["Amount"] = mutable["amount"]
        if "payment_method" in mutable and "PaymentMethod" not in mutable:
            mutable["PaymentMethod"] = mutable["payment_method"]
        if "paymentMethod" in mutable and "PaymentMethod" not in mutable:
            mutable["PaymentMethod"] = mutable["paymentMethod"]
        if "payment_date" in mutable and "PaymentDate" not in mutable:
            mutable["PaymentDate"] = mutable["payment_date"]
        if "paymentDate" in mutable and "PaymentDate" not in mutable:
            mutable["PaymentDate"] = mutable["paymentDate"]
        if "status" in mutable and "PaymentStatus" not in mutable:
            mutable["PaymentStatus"] = mutable["status"]
        if "paymentStatus" in mutable and "PaymentStatus" not in mutable:
            mutable["PaymentStatus"] = mutable["paymentStatus"]
        if not mutable.get("PaymentDate"):
            mutable["PaymentDate"] = timezone.now().date()
        if not mutable.get("PaymentStatus"):
            mutable["PaymentStatus"] = "Completed"

        return super().to_internal_value(mutable)

    def validate_Amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0.")
        return value

    def validate(self, data):
        from django.db.models import Sum
        bill = data.get("BillId")
        amount = data.get("Amount")
        if bill and amount is not None:
            existing_qs = Payment.objects.filter(BillId=bill)
            if self.instance:
                existing_qs = existing_qs.exclude(pk=self.instance.pk)
            already_paid = existing_qs.aggregate(total=Sum("Amount"))["total"] or 0
            remaining = bill.Amount - already_paid
            if amount > remaining:
                raise serializers.ValidationError(
                    {"Amount": f"Payment amount ({amount}) cannot exceed remaining bill amount ({remaining})."}
                )
        return data

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret["id"] = instance.PaymentId
        ret["bill"] = instance.BillId_id
        ret["bill_id"] = instance.BillId_id
        ret["amount"] = float(instance.Amount)
        ret["payment_method"] = instance.PaymentMethod
        ret["status"] = instance.PaymentStatus
        return ret
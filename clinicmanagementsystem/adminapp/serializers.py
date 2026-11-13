from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.db import transaction
from datetime import date
import re

from apibackendapp.models import (
    User,
    Role,
    Department,
    Staff,
    Doctor,
    LabTest,
    MasterMedicine,
    AuditLog,
    Dosage,
    PharmacyStock,
)


def calculate_age(birth_date):
    if not birth_date:
        return 0
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


class UserSerializer(serializers.ModelSerializer):
    Password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    Name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phoneNumber = serializers.CharField(write_only=True, required=False, allow_blank=True)
    DOB = serializers.DateField(write_only=True, required=False)
    DateofBirth = serializers.DateField(write_only=True, required=False)
    DateOfJoining = serializers.DateField(write_only=True, required=False)
    Address = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'UserId',
            'Username',
            'Password',
            'RoleId',
            'isActive',
            'Name',
            'phoneNumber',
            'DOB',
            'DateofBirth',
            'DateOfJoining',
            'Address',
        ]
        extra_kwargs = {
            'Password': {'write_only': True}
        }

    def validate_Username(self, value):
        val = str(value).strip()
        if not val:
            raise serializers.ValidationError("Username cannot be empty.")
        if " " in val:
            raise serializers.ValidationError("Username cannot contain spaces.")
        if len(val) < 3:
            raise serializers.ValidationError("Username must contain at least 3 characters.")
        return val

    def validate(self, data):
        # Handle DOB aliases
        dob = data.get('DOB') or data.get('DateofBirth')
        if dob:
            data['DOB'] = dob
            data['DateofBirth'] = dob

        # Creation validation
        if not self.instance:
            password = data.get('Password', '')
            if not password or not password.strip():
                raise serializers.ValidationError({"Password": "Password is required when creating a user."})
            if len(password) < 4:
                raise serializers.ValidationError({"Password": "Password must contain at least 4 characters."})

            # Validate staff fields for auto-creating staff record
            phone = str(data.get('phoneNumber', '')).strip()
            digits = re.sub(r"\D", "", phone)
            if not digits or len(digits) != 10:
                raise serializers.ValidationError({"phoneNumber": "Phone number must contain exactly 10 digits."})
            data['phoneNumber'] = digits

            if not dob:
                raise serializers.ValidationError({"DOB": "Date of birth is required for staff profile."})
            age = calculate_age(dob)
            if not (23 <= age <= 56):
                raise serializers.ValidationError({"DOB": f"Staff age must be between 23 and 56 years (currently {age})."})

        else:
            # Edit validation: leave password blank unless changed
            password = data.get('Password')
            if password is not None and password.strip() != "":
                if len(password) < 4:
                    raise serializers.ValidationError({"Password": "Password must contain at least 4 characters."})
            else:
                data.pop('Password', None)

            phone = data.get('phoneNumber')
            if phone:
                digits = re.sub(r"\D", "", str(phone).strip())
                if len(digits) != 10:
                    raise serializers.ValidationError({"phoneNumber": "Phone number must contain exactly 10 digits."})
                data['phoneNumber'] = digits

            if dob:
                age = calculate_age(dob)
                if not (23 <= age <= 56):
                    raise serializers.ValidationError({"DOB": f"Staff age must be between 23 and 56 years (currently {age})."})

        return data

    def create(self, validated_data):
        name = validated_data.pop('Name', None)
        phone = validated_data.pop('phoneNumber', None)
        dob_a = validated_data.pop('DOB', None)
        dob_b = validated_data.pop('DateofBirth', None)
        dob = dob_a or dob_b
        address = validated_data.pop('Address', None)
        doj = validated_data.pop('DateOfJoining', None) or date.today()

        password = validated_data.pop('Password')
        validated_data['Password'] = make_password(password)

        # Atomic transaction: creating User also creates Staff, rolls back User if Staff fails
        with transaction.atomic():
            user = User.objects.create(**validated_data)
            Staff.objects.create(
                UserId=user,
                Name=name or user.Username,
                DateofBirth=dob,
                DateOfJoining=doj,
                RoleId=user.RoleId,
                Address=address or "Clinic Address",
                phoneNumber=phone,
            )
            return user

    def update(self, instance, validated_data):
        name = validated_data.pop('Name', None)
        phone = validated_data.pop('phoneNumber', None)
        dob_a = validated_data.pop('DOB', None)
        dob_b = validated_data.pop('DateofBirth', None)
        dob = dob_a or dob_b
        address = validated_data.pop('Address', None)
        doj = validated_data.pop('DateOfJoining', None)

        password = validated_data.pop('Password', None)
        if password and password.strip():
            instance.Password = make_password(password)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update linked Staff record if present
        staff = getattr(instance, 'staff_profile', None)
        if staff:
            if name:
                staff.Name = name
            if phone:
                staff.phoneNumber = phone
            if dob:
                staff.DateofBirth = dob
            if address:
                staff.Address = address
            if doj:
                staff.DateOfJoining = doj
            if 'RoleId' in validated_data:
                staff.RoleId = instance.RoleId
            staff.save()

        return instance

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.RoleId:
            ret['RoleName'] = instance.RoleId.RoleName
            ret['role'] = instance.RoleId.RoleName

        staff = getattr(instance, 'staff_profile', None)
        if staff:
            ret['Name'] = staff.Name
            ret['name'] = staff.Name
            ret['phoneNumber'] = staff.phoneNumber
            ret['phone'] = staff.phoneNumber
            ret['DOB'] = str(staff.DateofBirth) if staff.DateofBirth else ""
            ret['DateofBirth'] = str(staff.DateofBirth) if staff.DateofBirth else ""
            ret['Address'] = staff.Address
            ret['address'] = staff.Address
            ret['DateOfJoining'] = str(staff.DateOfJoining) if staff.DateOfJoining else ""
            ret['StaffId'] = staff.StaffId

        return ret


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

    def validate_RoleName(self, value):
        if not value.strip():
            raise serializers.ValidationError("Role name cannot be empty.")
        return value


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

    def validate_DepartmentName(self, value):
        if not value.strip():
            raise serializers.ValidationError("Department name cannot be empty.")
        return value


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = '__all__'

    def validate_Name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Staff name cannot be empty.")
        return value

    def validate_phoneNumber(self, value):
        val = str(value).strip()
        digits = re.sub(r"\D", "", val)
        if len(digits) != 10:
            raise serializers.ValidationError("Phone number must contain exactly 10 digits.")
        return digits

    def validate_DateofBirth(self, value):
        age = calculate_age(value)
        if not (23 <= age <= 56):
            raise serializers.ValidationError(f"Staff age must be between 23 and 56 years (currently {age}).")
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.UserId:
            ret['Username'] = instance.UserId.Username
            ret['username'] = instance.UserId.Username
        if instance.RoleId:
            ret['RoleName'] = instance.RoleId.RoleName
            ret['role'] = instance.RoleId.RoleName
        return ret


class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'

    def validate_Name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Doctor name cannot be empty.")
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.DepartmentId:
            ret['DepartmentName'] = instance.DepartmentId.DepartmentName
            ret['department'] = instance.DepartmentId.DepartmentName
        if instance.UserId:
            ret['Username'] = instance.UserId.Username
        return ret


class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = '__all__'

    def validate_TestName(self, value):
        if not value.strip():
            raise serializers.ValidationError("Test name cannot be empty.")
        return value

    def validate_TestCost(self, value):
        if value <= 0:
            raise serializers.ValidationError("Test cost must be greater than 0.")
        return value


class MasterMedicineSerializer(serializers.ModelSerializer):
    class Meta:
        model = MasterMedicine
        fields = '__all__'

    def validate_MedicineName(self, value):
        if not value.strip():
            raise serializers.ValidationError("Medicine name cannot be empty.")
        return value

    def validate_CostValue(self, value):
        if value < 0:
            raise serializers.ValidationError("Cost value cannot be negative.")
        return value

    def validate_MRP(self, value):
        if value < 0:
            raise serializers.ValidationError("MRP cannot be negative.")
        return value

    def validate(self, data):
        cost = data.get("CostValue", getattr(self.instance, "CostValue", None))
        mrp = data.get("MRP", getattr(self.instance, "MRP", None))
        if cost is not None and mrp is not None and mrp < cost:
            raise serializers.ValidationError({"MRP": f"MRP ({mrp}) must be at least the cost value ({cost})."})
        return data

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        stock_entries = instance.stock_entries.all()
        stock_qty = sum(s.QuantityOnHand for s in stock_entries)
        ret['Quantity'] = stock_qty
        ret['quantity'] = stock_qty
        ret['QuantityOnHand'] = stock_qty
        return ret


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.UserId:
            ret['Username'] = instance.UserId.Username
        return ret


class DosageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dosage
        fields = '__all__'

    def validate_DosageValue(self, value):
        if not value.strip():
            raise serializers.ValidationError("Dosage value cannot be empty.")
        return value
from rest_framework import serializers
from apibackendapp.models import LabReport, LabTest, LabPrescription


class LabReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabReport
        fields = '__all__'

    def validate_ActualReading(self, value):
        if not str(value).strip():
            raise serializers.ValidationError("Actual reading cannot be empty.")
        return value

    def validate_remarks(self, value):
        if not str(value).strip():
            raise serializers.ValidationError("Remarks cannot be empty.")
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['id'] = instance.ReportId
        if instance.LabPrescriptionId:
            order = instance.LabPrescriptionId
            ret['order_id'] = order.LabPrescriptionId
            ret['patient_id'] = order.PatientId_id
            ret['patient_name'] = order.PatientId.Name if order.PatientId else ""
            ret['doctor_id'] = order.DoctorId_id
            ret['doctor_name'] = f"Dr. {order.DoctorId.Name}" if order.DoctorId else ""
            ret['test_name'] = order.LabTestId.TestName if order.LabTestId else ""
            ret['test_cost'] = float(order.LabTestId.TestCost) if order.LabTestId else 0
        if instance.ReportDate:
            ret['created_at'] = instance.ReportDate.strftime('%Y-%m-%d %H:%M')
            ret['report_date'] = instance.ReportDate.strftime('%Y-%m-%d')
        return ret


class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = '__all__'

    def validate_NormalName(self, value):
        value = str(value).strip()
        if not value:
            raise serializers.ValidationError("Normal value cannot be empty.")
        if value.isdigit():
            raise serializers.ValidationError("Normal name cannot contain only numbers.")
        return value

    def validate_TestCost(self, value):
        if value <= 0:
            raise serializers.ValidationError("Test cost must be greater than 0.")
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['id'] = instance.LabtestId
        return ret


class LabPrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabPrescription
        fields = '__all__'

    def validate_SampleType(self, value):
        if not str(value).strip():
            raise serializers.ValidationError("Sample type cannot be empty.")
        if len(str(value).strip()) < 3:
            raise serializers.ValidationError("Sample type must contain at least 3 characters.")
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['id'] = instance.LabPrescriptionId
        ret['patient_name'] = instance.PatientId.Name if instance.PatientId else ""
        ret['doctor_name'] = f"Dr. {instance.DoctorId.Name}" if instance.DoctorId else ""
        ret['test_name'] = instance.LabTestId.TestName if instance.LabTestId else ""
        ret['notes'] = instance.SampleType
        ret['status'] = instance.Status
        if instance.LabTestDate:
            ret['created_at'] = instance.LabTestDate.strftime('%Y-%m-%d %H:%M')
        return ret
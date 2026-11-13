from rest_framework import serializers
from apibackendapp.models import (
    Doctor, Consultation, Prescription, PrescriptionItem, LabPrescription,
    User, Department, MasterMedicine, Dosage, LabTest, Patient, Appointment
)
import re

def symptoms_validation(value):
    if len(value.strip()) < 3:
        raise serializers.ValidationError("Symptoms must be at least 3 characters.")
    return value

def diagnosis_validation(value):
    if len(value.strip()) < 3:
        raise serializers.ValidationError("Diagnosis must be at least 3 characters.")
    return value

def frequency_validation(value):
    if not re.match(r'^[\d\-A-Za-z\s]+$', value):
        raise serializers.ValidationError("Frequency must be a valid pattern,like '1-0-1' or 'Once daily'.")
    return value


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model=User
        fields=('UserId', 'Username')

class DepartmentMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model=Department
        fields=('DepartmentId', 'DepartmentName')

class MedicineMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model=MasterMedicine
        fields=('MedicineId', 'MedicineName')

class DosageMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model=Dosage
        fields=('DosageId', 'DosageValue', 'Instructions')

class LabTestMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model=LabTest
        fields=('LabtestId', 'TestName', 'TestCost')


class DoctorSerializer(serializers.ModelSerializer):
    User=UserMiniSerializer(source='UserId', read_only=True)
    Department=DepartmentMiniSerializer(source='DepartmentId', read_only=True)

    class Meta:
        model=Doctor
        fields=('DoctorId', 'Name', 'UserId', 'User', 'DepartmentId', 'Department',
                  'Qualification', 'Specialization', 'isActive')


class PrescriptionItemSerializer(serializers.ModelSerializer):
    Medicine=MedicineMiniSerializer(source='MedicineId', read_only=True)
    Dosage=DosageMiniSerializer(source='DosageId', read_only=True)
    Frequency=serializers.CharField(max_length=30, validators=[frequency_validation])

    class Meta:
        model=PrescriptionItem
        fields=('PrescriptionItemId', 'PrescriptionId', 'MedicineId', 'Medicine','DosageId', 'Dosage', 'Duration', 'Frequency')


class PrescriptionSerializer(serializers.ModelSerializer):
    item_details=PrescriptionItemSerializer(source='items', many=True, read_only=True)

    class Meta:
        model=Prescription
        fields=('PrescriptionId', 'ConsultationId', 'PatientId', 'DoctorId','PrescriptionDateTime', 'Status', 'item_details')

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['id'] = instance.PrescriptionId
        ret['consultation'] = instance.ConsultationId_id if instance.ConsultationId else ""
        ret['consultation_id'] = instance.ConsultationId_id if instance.ConsultationId else ""
        ret['patient_name'] = instance.PatientId.Name if instance.PatientId else ""
        ret['doctor_name'] = f"Dr. {instance.DoctorId.Name}" if instance.DoctorId else ""
        ret['status'] = instance.Status
        ret['notes'] = instance.Status
        if instance.PrescriptionDateTime:
            ret['created_at'] = instance.PrescriptionDateTime.strftime('%Y-%m-%d %H:%M')
        return ret


class LabPrescriptionSerializer(serializers.ModelSerializer):
    LabTestId = serializers.PrimaryKeyRelatedField(queryset=LabTest.objects.all(), required=False)
    LabTest = LabTestMiniSerializer(source='LabTestId', read_only=True)
    PatientId = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False)
    DoctorId = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all(), required=False)
    ConsultationId = serializers.PrimaryKeyRelatedField(queryset=Consultation.objects.all(), required=False)
    SampleType = serializers.CharField(max_length=100, required=False)

    class Meta:
        model=LabPrescription
        fields=('LabPrescriptionId', 'LabTestId', 'LabTest', 'PatientId', 'DoctorId','ConsultationId', 'Status', 'SampleType', 'LabTestDate')

    def to_internal_value(self, data):
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'test' in mutable and 'LabTestId' not in mutable:
            mutable['LabTestId'] = mutable['test']
        if 'test_id' in mutable and 'LabTestId' not in mutable:
            mutable['LabTestId'] = mutable['test_id']
        if 'lab_test_id' in mutable and 'LabTestId' not in mutable:
            mutable['LabTestId'] = mutable['lab_test_id']
        if 'test_name' in mutable and 'LabTestId' not in mutable:
            test_obj = LabTest.objects.filter(TestName__icontains=mutable['test_name']).first()
            if test_obj:
                mutable['LabTestId'] = test_obj.LabtestId
        if 'patient' in mutable and 'PatientId' not in mutable:
            mutable['PatientId'] = mutable['patient']
        if 'patient_id' in mutable and 'PatientId' not in mutable:
            mutable['PatientId'] = mutable['patient_id']
        if 'doctor' in mutable and 'DoctorId' not in mutable:
            mutable['DoctorId'] = mutable['doctor']
        if 'doctor_id' in mutable and 'DoctorId' not in mutable:
            mutable['DoctorId'] = mutable['doctor_id']
        if 'consultation' in mutable and 'ConsultationId' not in mutable:
            mutable['ConsultationId'] = mutable['consultation']
        if 'consultation_id' in mutable and 'ConsultationId' not in mutable:
            mutable['ConsultationId'] = mutable['consultation_id']
        if 'sample_type' in mutable and 'SampleType' not in mutable:
            mutable['SampleType'] = mutable['sample_type']
        if 'notes' in mutable and 'SampleType' not in mutable:
            mutable['SampleType'] = mutable['notes']
        if not mutable.get('SampleType'):
            mutable['SampleType'] = 'Blood'
        if 'status' in mutable and 'Status' not in mutable:
            mutable['Status'] = mutable['status']
        if not mutable.get('Status'):
            mutable['Status'] = 'Sample collected'

        cid = mutable.get('ConsultationId')
        if cid:
            try:
                c = Consultation.objects.get(pk=cid)
                if not mutable.get('PatientId'):
                    mutable['PatientId'] = c.PatientId_id
                if not mutable.get('DoctorId'):
                    mutable['DoctorId'] = c.DoctorId_id
            except Exception:
                pass

        return super().to_internal_value(mutable)

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
        first_report = instance.reports.first() if hasattr(instance, 'reports') else None
        if first_report:
            ret['report'] = {
                'id': first_report.ReportId,
                'actual_reading': first_report.ActualReading,
                'remarks': first_report.remarks,
                'date': first_report.ReportDate.strftime('%Y-%m-%d %H:%M') if first_report.ReportDate else None
            }
        return ret


class ConsultationSerializer(serializers.ModelSerializer):
    PatientId = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False)
    DoctorId = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all(), required=False)
    ConsultationStatus = serializers.ChoiceField(choices=Consultation.CONSULTATION_CHOICES, required=True)
    Symptoms=serializers.CharField(max_length=100, validators=[symptoms_validation])
    Diagnosis=serializers.CharField(max_length=100, validators=[diagnosis_validation])

    prescription_details = PrescriptionSerializer(source='prescriptions', many=True, read_only=True)
    lab_prescription_details = LabPrescriptionSerializer(source='lab_orders', many=True, read_only=True)

    class Meta:
        model=Consultation
        fields=('ConsultationId', 'AppointmentId', 'PatientId', 'DoctorId','ConsultationStatus', 'Diagnosis', 'Symptoms', 'Remarks',
        'prescription_details', 'lab_prescription_details')

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'diagnosis' in mutable_data and 'Diagnosis' not in mutable_data:
            mutable_data['Diagnosis'] = mutable_data['diagnosis']
        if 'symptoms' in mutable_data and 'Symptoms' not in mutable_data:
            mutable_data['Symptoms'] = mutable_data['symptoms']
        if 'notes' in mutable_data and 'Remarks' not in mutable_data:
            mutable_data['Remarks'] = mutable_data['notes'] or 'None'
        if 'appointment' in mutable_data and 'AppointmentId' not in mutable_data:
            mutable_data['AppointmentId'] = mutable_data['appointment']
        if 'patient' in mutable_data and 'PatientId' not in mutable_data:
            mutable_data['PatientId'] = mutable_data['patient']
        if 'doctor' in mutable_data and 'DoctorId' not in mutable_data:
            mutable_data['DoctorId'] = mutable_data['doctor']
        if 'status' in mutable_data and 'ConsultationStatus' not in mutable_data:
            mutable_data['ConsultationStatus'] = mutable_data['status']
        if 'consultation_status' in mutable_data and 'ConsultationStatus' not in mutable_data:
            mutable_data['ConsultationStatus'] = mutable_data['consultation_status']

        if not mutable_data.get('ConsultationStatus'):
            # Must be sent explicitly, missing value returns 400
            raise serializers.ValidationError({"ConsultationStatus": "ConsultationStatus must be sent explicitly."})

        # Auto-fill PatientId and DoctorId from Appointment if missing
        appt_id = mutable_data.get('AppointmentId')
        if appt_id:
            from apibackendapp.models import Appointment
            try:
                appt = Appointment.objects.get(pk=appt_id)
                if not mutable_data.get('PatientId'):
                    mutable_data['PatientId'] = appt.PatientId_id
                if not mutable_data.get('DoctorId'):
                    mutable_data['DoctorId'] = appt.DoctorId_id
            except Exception:
                pass

        if not mutable_data.get('Remarks'):
            mutable_data['Remarks'] = 'Routine consultation'

        return super().to_internal_value(mutable_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['id'] = instance.ConsultationId
        ret['patient_name'] = instance.PatientId.Name if instance.PatientId else ""
        ret['doctor_name'] = f"Dr. {instance.DoctorId.Name}" if instance.DoctorId else ""
        ret['symptoms'] = instance.Symptoms
        ret['diagnosis'] = instance.Diagnosis
        ret['notes'] = instance.Remarks
        ret['status'] = instance.ConsultationStatus
        if instance.AppointmentId and instance.AppointmentId.AppointmentDateTime:
            ret['created_at'] = instance.AppointmentId.AppointmentDateTime.strftime('%Y-%m-%d %H:%M')
        return ret


class PrescriptionItemWriteSerializer(serializers.ModelSerializer):
    Frequency = serializers.CharField(max_length=30, required=False, validators=[frequency_validation])
    Duration = serializers.CharField(max_length=30, required=False)
    MedicineId = serializers.PrimaryKeyRelatedField(queryset=MasterMedicine.objects.all(), required=False)
    DosageId = serializers.PrimaryKeyRelatedField(queryset=Dosage.objects.all(), required=False)

    class Meta:
        model = PrescriptionItem
        fields = ('MedicineId', 'DosageId', 'Duration', 'Frequency')

    def to_internal_value(self, data):
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)
        med = mutable.get('MedicineId') or mutable.get('medicine_id') or mutable.get('medicine')
        if med is not None:
            if isinstance(med, str) and not med.isdigit():
                med_obj = MasterMedicine.objects.filter(MedicineName__icontains=med).first()
                if med_obj:
                    mutable['MedicineId'] = med_obj.MedicineId
            else:
                mutable['MedicineId'] = int(med)

        dos = mutable.get('DosageId') or mutable.get('dosage_id') or mutable.get('dosage')
        if dos is not None:
            if isinstance(dos, str) and not dos.isdigit():
                dos_obj = Dosage.objects.filter(DosageValue__icontains=dos).first()
                if not dos_obj:
                    dos_obj, _ = Dosage.objects.get_or_create(DosageValue=dos)
                mutable['DosageId'] = dos_obj.DosageId
            else:
                mutable['DosageId'] = int(dos)

        if 'duration' in mutable and 'Duration' not in mutable:
            mutable['Duration'] = mutable['duration']
        if not mutable.get('Duration'):
            mutable['Duration'] = '5 days'

        if 'frequency' in mutable and 'Frequency' not in mutable:
            mutable['Frequency'] = mutable['frequency']
        if not mutable.get('Frequency'):
            mutable['Frequency'] = '1-0-1'

        return super().to_internal_value(mutable)


class PrescriptionCreateSerializer(serializers.ModelSerializer):
    PatientId = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False)
    DoctorId = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all(), required=False)
    ConsultationId = serializers.PrimaryKeyRelatedField(queryset=Consultation.objects.all(), required=False)
    items = PrescriptionItemWriteSerializer(many=True, write_only=True)

    class Meta:
        model = Prescription
        fields = ('ConsultationId', 'PatientId', 'DoctorId', 'PrescriptionDateTime', 'Status', 'items')

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'consultation' in mutable_data and 'ConsultationId' not in mutable_data:
            mutable_data['ConsultationId'] = mutable_data['consultation']
        if 'patient' in mutable_data and 'PatientId' not in mutable_data:
            mutable_data['PatientId'] = mutable_data['patient']
        if 'doctor' in mutable_data and 'DoctorId' not in mutable_data:
            mutable_data['DoctorId'] = mutable_data['doctor']

        # Auto-fill PatientId and DoctorId from Consultation if missing
        cid = mutable_data.get('ConsultationId')
        if cid:
            from apibackendapp.models import Consultation
            try:
                c = Consultation.objects.get(pk=cid)
                if not mutable_data.get('PatientId'):
                    mutable_data['PatientId'] = c.PatientId_id
                if not mutable_data.get('DoctorId'):
                    mutable_data['DoctorId'] = c.DoctorId_id
            except Exception:
                pass

        if not mutable_data.get('PrescriptionDateTime'):
            from django.utils import timezone
            mutable_data['PrescriptionDateTime'] = timezone.now()

        return super().to_internal_value(mutable_data)

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        prescription = Prescription.objects.create(**validated_data)
        for item_data in items_data:
            PrescriptionItem.objects.create(PrescriptionId=prescription, **item_data)
        return prescription

    def to_representation(self, instance):
        return PrescriptionSerializer(instance).data
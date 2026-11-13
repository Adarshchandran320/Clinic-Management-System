from django.contrib import admin
from .models import Doctor, Consultation, Prescription, PrescriptionItem, LabPrescription,Role,User,Department
# Register your models here.
class PrescriptionItemInline(admin.TabularInline):
    model=PrescriptionItem  
    extra=1

class PrescriptionAdmin(admin.ModelAdmin):
    inlines=[PrescriptionItemInline]
    list_display=('PrescriptionId', 'ConsultationId', 'DoctorId', 'Status', 'PrescriptionDateTime')
    list_filter=('Status',)
    search_fields=('DoctorId__Name',)

admin.site.register(Prescription,PrescriptionAdmin)

class LabPrescriptionInline(admin.TabularInline):
    model=LabPrescription
    extra=1

class ConsultationAdmin(admin.ModelAdmin):
    inlines=[LabPrescriptionInline]
    list_display=('ConsultationId', 'AppointmentId', 'PatientId', 'DoctorId', 'ConsultationStatus')
    list_filter=('ConsultationStatus',)

admin.site.register(Consultation,ConsultationAdmin)
admin.site.register(Doctor)
admin.site.register(Role)
admin.site.register(Department)
admin.site.register(User)
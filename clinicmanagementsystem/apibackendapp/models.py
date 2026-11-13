from django.db import models
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password

class Role(models.Model):
    RoleId=models.AutoField(primary_key=True)
    RoleName=models.CharField(max_length=30,unique=True)

    def __str__(self):
        return self.RoleName

class User(models.Model):
    UserId=models.AutoField(primary_key=True)
    Username=models.CharField(max_length=100,unique=True)
    Password=models.CharField(max_length=255)
    RoleId=models.ForeignKey(Role,on_delete=models.CASCADE)
    isActive=models.BooleanField(default=True)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def set_password(self, raw_password):
        self.Password = make_password(raw_password)

    def check_password(self, raw_password):
        if not self.Password:
            return False
        # Support hashed password
        if check_password(raw_password, self.Password):
            return True
        # Backwards compatibility: fallback to plain text if not yet hashed
        if self.Password == raw_password:
            # Auto-upgrade to secure hashed password
            self.set_password(raw_password)
            self.save(update_fields=['Password'])
            return True
        return False

    def __str__(self):
        return self.Username


class Department(models.Model):
    DepartmentId=models.AutoField(primary_key=True)
    DepartmentName=models.CharField(max_length=30)
    isActive=models.BooleanField(default=True)

    def __str__(self):
        return self.DepartmentName

class Staff(models.Model):
    StaffId=models.AutoField(primary_key=True)
    UserId=models.OneToOneField(User,on_delete=models.CASCADE,related_name='staff_profile')
    Name=models.CharField(max_length=100)
    DateofBirth=models.DateField()
    DateOfJoining=models.DateField()
    RoleId=models.ForeignKey(Role,on_delete=models.CASCADE)
    Address=models.CharField(max_length=100)
    phoneNumber=models.CharField(max_length=15)

    def __str__(self):
        return self.Name
    
class AuditLog(models.Model):
    AuditId = models.AutoField(primary_key=True)

    StaffId = models.ForeignKey(
        Staff,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )

    UserId = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_audit_logs'
    )

    ActionType = models.CharField(max_length=100)
    TableAffected = models.CharField(max_length=100)
    RecordId = models.IntegerField(null=True)
    Details = models.TextField(blank=True, null=True)
    action_time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.ActionType} on {self.TableAffected}"

class LabTest(models.Model):
    LabtestId=models.AutoField(primary_key=True)
    DepartmentId=models.ForeignKey(Department,on_delete=models.SET_NULL,null=True,related_name='lab_tests')
    TestName=models.CharField(max_length=100)
    NormalName=models.CharField(max_length=100)
    TestCost=models.DecimalField(max_digits=10,decimal_places=2)
    isActive=models.BooleanField(default=True)

    def __str__(self):
        return self.TestName

class Doctor(models.Model):
    DoctorId=models.AutoField(primary_key=True)
    Name=models.CharField(max_length=30)
    UserId=models.OneToOneField(User,on_delete=models.CASCADE,related_name='doctor_profile')
    DepartmentId=models.ForeignKey(Department,on_delete=models.CASCADE)
    Qualification=models.CharField(max_length=100)
    Specialization=models.CharField(max_length=100)
    isActive=models.BooleanField(default=True)

    def __str__(self):
        return f"Dr.{self.Name}"

class Patient(models.Model):
    PatientId=models.AutoField(primary_key=True)
    Name=models.CharField(max_length=100)
    Gender=models.CharField(max_length=20)
    DOB=models.DateField()
    PhoneNumber=models.CharField(max_length=15)
    Address=models.CharField(max_length=100)
    BloodGroup=models.CharField(max_length=10)
    Weight=models.FloatField()
    Height=models.FloatField()

    def __str__(self):
        return self.Name

class Appointment(models.Model):
    STATUS_CHOICES=[
        ('Scheduled','Scheduled'),
        ('Waiting','Waiting'),
        ('Completed','Completed'),
        ('Cancelled','Cancelled')
    ]
    AppointmentId=models.AutoField(primary_key=True)
    PatientId=models.ForeignKey(Patient,on_delete=models.CASCADE)
    ReceptionistId=models.ForeignKey(Staff,on_delete=models.CASCADE,related_name='receptionist_profile')
    DoctorId=models.ForeignKey(Doctor,on_delete=models.CASCADE)
    DepartmentId=models.ForeignKey(Department,on_delete=models.CASCADE)
    AppointmentStatus=models.CharField(max_length=20,choices=STATUS_CHOICES,default='Scheduled')
    AppointmentDateTime=models.DateTimeField()

    def __str__(self):
        return f"{self.PatientId.Name} with {self.DoctorId} on {self.AppointmentDateTime}"

class Token(models.Model):
    TokenNo=models.AutoField(primary_key=True)
    AppointmentId=models.ForeignKey(Appointment,on_delete=models.CASCADE)
    PatientId=models.ForeignKey(Patient,on_delete=models.CASCADE)
    DoctorId=models.ForeignKey(Doctor,on_delete=models.CASCADE)
    TokenDate=models.DateTimeField()

    def __str__(self):
        return f"Token #{self.TokenNo}"
    
class Consultation(models.Model):
    CONSULTATION_CHOICES=[
            ('Waiting','Waiting'),
            ('Completed','Completed'),
            ('Ongoing','Ongoing')
        ]
    ConsultationId=models.AutoField(primary_key=True)
    AppointmentId=models.ForeignKey(Appointment,on_delete=models.CASCADE)
    PatientId=models.ForeignKey(Patient,on_delete=models.CASCADE)
    DoctorId=models.ForeignKey(Doctor,on_delete=models.CASCADE)
    ConsultationStatus=models.CharField(max_length=20,choices=CONSULTATION_CHOICES,default='Waiting')
    Diagnosis=models.CharField(max_length=100)
    Symptoms=models.CharField(max_length=100)
    Remarks=models.CharField(max_length=200)

    def __str__(self):
        return f"Consultation #{self.ConsultationId}"
    

    
class Dosage(models.Model):
    DOSAGE_CHOICES=[
        ('250mg','250mg'),
        ('500mg','500mg'),
        ('650mg','650mg'),
        ('1000mg','1000mg'),
        ('5ml','5ml'),
        ('10ml','10ml'),
        ('1 tablet','1 tablet'),
    ]
    DosageId=models.AutoField(primary_key=True)
    DosageValue=models.CharField(max_length=50, choices=DOSAGE_CHOICES)
    Instructions=models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.DosageValue

class MasterMedicine(models.Model):
    MedicineId = models.AutoField(primary_key=True)
    MedicineName = models.CharField(max_length=200, db_index=True)
    Manufacturer = models.CharField(max_length=200)
    GenericName = models.CharField(max_length=200, blank=True)
    Category = models.CharField(max_length=100, blank=True)
    CostValue = models.DecimalField(max_digits=10, decimal_places=2)
    MRP = models.DecimalField(max_digits=10, decimal_places=2)
    isActive = models.BooleanField(default=True)

    def __str__(self):
        return self.MedicineName
    
class Prescription(models.Model):
    PRESCRIPTION_CHOICES=[
                ('Dispensed','Dispensed'),
                ('Not Dispensed','Not Dispensed'),
                ('Partially Dispensed','Partially Dispensed')
            ]
    PrescriptionId=models.AutoField(primary_key=True)
    ConsultationId=models.ForeignKey(Consultation,on_delete=models.CASCADE,related_name='prescriptions')
    PatientId=models.ForeignKey(Patient,on_delete=models.CASCADE)
    DoctorId=models.ForeignKey(Doctor,on_delete=models.CASCADE)
    PrescriptionDateTime=models.DateTimeField()
    Status=models.CharField(max_length=30,choices=PRESCRIPTION_CHOICES,default='Not Dispensed')

    def __str__(self):
        return f"Prescription #{self.PrescriptionId}"
    
class PrescriptionItem(models.Model):
    PrescriptionItemId=models.AutoField(primary_key=True)
    PrescriptionId=models.ForeignKey(Prescription,on_delete=models.CASCADE,related_name='items')
    MedicineId=models.ForeignKey(MasterMedicine,on_delete=models.CASCADE)
    DosageId=models.ForeignKey(Dosage,on_delete=models.CASCADE)
    Duration=models.CharField(max_length=30)
    Frequency=models.CharField(max_length=30) 

    def __str__(self):
        return f"{self.MedicineId.MedicineName}-Rx #{self.PrescriptionItemId}"
    
class LabPrescription(models.Model):
    STATUS_CHOICES=[
        ('Sample collected','Sample collected'),
        ('In Progress','In Progress'),
        ('Completed','Completed'),
        ('Cancelled','Cancelled'),
    ]

    LabPrescriptionId=models.AutoField(primary_key=True)
    LabTestId=models.ForeignKey(LabTest,on_delete=models.SET_NULL,null=True,related_name='lab_prescriptions')
    PatientId=models.ForeignKey(Patient,on_delete=models.SET_NULL,null=True,related_name='lab_prescriptions')
    DoctorId=models.ForeignKey(Doctor,on_delete=models.SET_NULL,null=True,related_name='lab_prescription')
    ConsultationId=models.ForeignKey(Consultation,on_delete=models.SET_NULL,null=True,related_name='lab_orders')
    Status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='In Progress')
    SampleType=models.CharField(max_length=100)
    LabTestDate=models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Lab Prescription #{self.LabPrescriptionId}"

class LabReport(models.Model):
    ReportId=models.AutoField(primary_key=True)
    LabPrescriptionId=models.ForeignKey(LabPrescription,on_delete=models.CASCADE,related_name='reports')
    LabTechnician=models.ForeignKey(Staff,on_delete=models.SET_NULL,null=True,related_name='lab_reports')
    ReportDate=models.DateTimeField(default=timezone.now)
    ActualReading=models.TextField()
    remarks=models.TextField()

    def __str__(self):
        return f"Report #{self.ReportId}"

    
class PharmacyStock(models.Model):
    StockId = models.AutoField(primary_key=True)
    Medicine = models.ForeignKey(MasterMedicine, on_delete=models.CASCADE,related_name='stock_entries')
    QuantityOnHand = models.IntegerField(default=0)
    UnitPrice = models.DecimalField(max_digits=10, decimal_places=2)
    SellingPrice = models.DecimalField(max_digits=10, decimal_places=2)
    ReorderLevel = models.IntegerField(default=10)
    LastUpdated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Stock #{self.StockId}"
 

class PharmacyBill(models.Model):
    BillId = models.AutoField(primary_key=True)
    Patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    Prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE,  blank=True,null=True)
    DispensedBy = models.ForeignKey(Staff,on_delete=models.CASCADE)
    BillDate = models.DateField(auto_now_add=True)
    TotalAmount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"Pharmacy Bill #{self.BillId}"

    
class PharmacyBillItem(models.Model):
    BillItemId = models.AutoField(primary_key=True)
    Bill = models.ForeignKey(PharmacyBill, on_delete=models.CASCADE,related_name='items')
    Medicine = models.ForeignKey(MasterMedicine, on_delete=models.CASCADE)
    Quantity = models.IntegerField()
    UnitPrice = models.DecimalField(max_digits=10, decimal_places=2)
    LineAmount = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"Bill Item #{self.BillItemId}"



class Bill(models.Model):
    BillId = models.AutoField(primary_key=True)
    PatientId = models.ForeignKey(Patient,on_delete=models.CASCADE)
    BillDate = models.DateField()
    Amount = models.DecimalField(max_digits=10,decimal_places=2)
    BillStatus = models.CharField(max_length=50)
    BillType = models.CharField(max_length=50)

    def __str__(self):
        return f"Bill #{self.BillId}"

class Payment(models.Model):
    PaymentId = models.AutoField(primary_key=True)
    BillId = models.ForeignKey(Bill,on_delete=models.CASCADE)
    Amount = models.DecimalField(max_digits=10,decimal_places=2)
    PaymentMethod = models.CharField(max_length=50)
    PaymentDate = models.DateField()
    PaymentStatus = models.CharField(max_length=50)

    def __str__(self):
        return f"Payment #{self.PaymentId}"


class Notification(models.Model):
    NotificationId = models.AutoField(primary_key=True)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=50)
    related_model = models.CharField(max_length=100, null=True, blank=True)
    related_id = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def id(self):
        return self.NotificationId

    def __str__(self):
        return f"Notification({self.recipient.Username}: {self.title})"
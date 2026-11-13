from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from apibackendapp.models import (
    Role,
    User,
    Department,
    Staff,
    Doctor,
    Patient,
    Appointment,
    Token,
    Consultation,
    Dosage,
    MasterMedicine,
    PharmacyStock,
    Prescription,
    PrescriptionItem,
    LabTest,
    LabPrescription,
    LabReport,
)


class Command(BaseCommand):
    help = "Seeds all necessary Roles, Departments, Users, Doctors, Staff, Medicines, and Test Data for the Clinic Management System."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting CMS data seeding..."))

        # 1. Create Roles
        roles_to_create = ["Admin", "Doctor", "Receptionist", "Pharmacist", "Lab Technician"]
        roles = {}
        for role_name in roles_to_create:
            role_obj, created = Role.objects.get_or_create(RoleName=role_name)
            roles[role_name] = role_obj
            status_text = "Created" if created else "Found existing"
            self.stdout.write(f"  - {status_text} Role: {role_name}")

        # 2. Create Departments
        depts_data = [
            "General Medicine",
            "Cardiology",
            "Pediatrics",
            "Orthopedics",
            "Pathology",
        ]
        departments = {}
        for dept_name in depts_data:
            dept_obj, created = Department.objects.get_or_create(
                DepartmentName=dept_name,
                defaults={"isActive": True}
            )
            departments[dept_name] = dept_obj

        # 3. Create or Update Users with hashed passwords
        test_users = [
            ("admin1", "admin123", "Admin"),
            ("doctor1", "doctor123", "Doctor"),
            ("receptionist1", "receptionist123", "Receptionist"),
            ("pharmacist1", "pharmacist123", "Pharmacist"),
            ("lab1", "lab123", "Lab Technician"),
        ]

        users = {}
        for username, password, role_name in test_users:
            user = User.objects.filter(Username=username).first()
            if not user:
                user = User(
                    Username=username,
                    RoleId=roles[role_name],
                    isActive=True
                )
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"  + Created user: {username} ({role_name})"))
            else:
                user.RoleId = roles[role_name]
                user.isActive = True
                user.set_password(password)
                user.save()
                self.stdout.write(f"  ~ Updated password for existing user: {username} ({role_name})")
            users[username] = user

        # 4. Create Linked Doctor Record
        doc_user = users["doctor1"]
        doctor_obj, doc_created = Doctor.objects.get_or_create(
            UserId=doc_user,
            defaults={
                "Name": "Sarah Jenkins",
                "DepartmentId": departments["Cardiology"],
                "Qualification": "MD, DM Cardiology",
                "Specialization": "Cardiologist",
                "isActive": True,
            }
        )
        if not doc_created:
            doctor_obj.Name = "Sarah Jenkins"
            doctor_obj.DepartmentId = departments["Cardiology"]
            doctor_obj.Qualification = "MD, DM Cardiology"
            doctor_obj.Specialization = "Cardiologist"
            doctor_obj.isActive = True
            doctor_obj.save()

        # 5. Create Linked Staff Records
        staff_data = [
            ("receptionist1", "Emily Clark", "Receptionist", "+1-555-0101", "123 Clinic Ave, Suite 1"),
            ("pharmacist1", "David Miller", "Pharmacist", "+1-555-0102", "456 Health Blvd, Pharmacy Dept"),
            ("lab1", "Michael Chang", "Lab Technician", "+1-555-0103", "789 Lab St, Diagnostics Wing"),
        ]
        staff_objs = {}
        for uname, staff_name, rname, phone, addr in staff_data:
            s_user = users[uname]
            staff_obj = Staff.objects.filter(UserId=s_user).first()
            if not staff_obj:
                staff_obj = Staff.objects.create(
                    UserId=s_user,
                    Name=staff_name,
                    DateofBirth=date(1992, 5, 14),
                    DateOfJoining=date(2023, 1, 10),
                    RoleId=roles[rname],
                    Address=addr,
                    phoneNumber=phone,
                )
            staff_objs[uname] = staff_obj

        # 6. Create Dosages
        dosages_list = [
            ("250mg", "Once daily after meals"),
            ("500mg", "Twice daily after meals"),
            ("650mg", "Every 6-8 hours as needed for fever"),
            ("1000mg", "Once daily"),
            ("5ml", "Twice daily"),
            ("10ml", "Three times daily"),
            ("1 tablet", "Once daily at bedtime"),
        ]
        dosage_objs = {}
        for dval, instr in dosages_list:
            d_obj, _ = Dosage.objects.get_or_create(
                DosageValue=dval,
                defaults={"Instructions": instr}
            )
            dosage_objs[dval] = d_obj

        # 7. Create Master Medicines & Stock
        medicines_list = [
            ("Dolo 650 Tablet", "Micro Labs Ltd", "Paracetamol", "Analgesic & Antipyretic", Decimal("2.14"), Decimal("32.12")),
            ("Pan 40 Tablet", "Alkem Laboratories", "Pantoprazole", "Antacid / PPI", Decimal("8.50"), Decimal("155.00")),
            ("Amoxicillin 500mg", "Cipla Ltd", "Amoxicillin", "Antibiotic", Decimal("5.00"), Decimal("85.00")),
            ("Cetirizine 10mg", "Dr. Reddy's", "Cetirizine", "Antihistamine", Decimal("1.20"), Decimal("22.50")),
            ("Metformin 500mg", "Sun Pharma", "Metformin HCl", "Antidiabetic", Decimal("3.00"), Decimal("45.00")),
        ]
        med_objs = {}
        for mname, mfg, gen, cat, cost, mrp in medicines_list:
            m_obj, _ = MasterMedicine.objects.get_or_create(
                MedicineName=mname,
                defaults={
                    "Manufacturer": mfg,
                    "GenericName": gen,
                    "Category": cat,
                    "CostValue": cost,
                    "MRP": mrp,
                    "isActive": True,
                }
            )
            med_objs[mname] = m_obj

            # Ensure Pharmacy Stock exists
            PharmacyStock.objects.get_or_create(
                Medicine=m_obj,
                defaults={
                    "QuantityOnHand": 120,
                    "UnitPrice": cost,
                    "SellingPrice": mrp,
                    "ReorderLevel": 20,
                }
            )

        # 8. Create Lab Tests
        lab_tests = [
            ("Complete Blood Count (CBC)", "Hemoglobin: 12-16 g/dL, WBC: 4000-11000", Decimal("350.00"), departments["Pathology"]),
            ("Lipid Profile", "Cholesterol: <200 mg/dL, HDL: >40 mg/dL", Decimal("700.00"), departments["Pathology"]),
            ("Fasting Blood Sugar", "Fasting Glucose: 70-99 mg/dL", Decimal("150.00"), departments["Pathology"]),
            ("Liver Function Test (LFT)", "SGOT: 8-45 U/L, SGPT: 7-56 U/L", Decimal("650.00"), departments["Pathology"]),
        ]
        lab_test_objs = {}
        for tname, normal, cost, dept in lab_tests:
            t_obj, _ = LabTest.objects.get_or_create(
                TestName=tname,
                defaults={
                    "DepartmentId": dept,
                    "NormalName": normal,
                    "TestCost": cost,
                    "isActive": True,
                }
            )
            lab_test_objs[tname] = t_obj

        # 9. Create Sample Patients
        patients_data = [
            ("John Doe", "Male", date(1985, 3, 22), "+1-555-1001", "742 Evergreen Terrace", "O+", 78.5, 178.0),
            ("Jane Smith", "Female", date(1990, 7, 11), "+1-555-1002", "101 Maple Street", "A+", 62.0, 165.0),
            ("Robert Johnson", "Male", date(1978, 11, 5), "+1-555-1003", "404 Elm Road", "B+", 85.0, 182.0),
            ("Maria Garcia", "Female", date(1995, 1, 30), "+1-555-1004", "12 Oak Ave", "AB+", 55.0, 160.0),
        ]
        patient_objs = []
        for pname, gender, dob, phone, addr, bg, w, h in patients_data:
            p_obj, _ = Patient.objects.get_or_create(
                PhoneNumber=phone,
                defaults={
                    "Name": pname,
                    "Gender": gender,
                    "DOB": dob,
                    "Address": addr,
                    "BloodGroup": bg,
                    "Weight": w,
                    "Height": h,
                }
            )
            patient_objs.append(p_obj)

        # 10. Create Sample Appointments & Tokens
        receptionist_staff = staff_objs["receptionist1"]
        now = timezone.now()
        appts = []
        for i, pat in enumerate(patient_objs):
            appt_time = now - timedelta(hours=i * 2)
            appt_obj, _ = Appointment.objects.get_or_create(
                PatientId=pat,
                DoctorId=doctor_obj,
                DepartmentId=departments["Cardiology"],
                AppointmentDateTime=appt_time,
                defaults={
                    "ReceptionistId": receptionist_staff,
                    "AppointmentStatus": "Completed" if i == 0 else "Scheduled",
                }
            )
            appts.append(appt_obj)

            Token.objects.get_or_create(
                AppointmentId=appt_obj,
                PatientId=pat,
                DoctorId=doctor_obj,
                defaults={"TokenDate": appt_time}
            )

        # 11. Create Sample Consultation & Prescription
        first_appt = appts[0]
        consultation, _ = Consultation.objects.get_or_create(
            AppointmentId=first_appt,
            PatientId=first_appt.PatientId,
            DoctorId=doctor_obj,
            defaults={
                "ConsultationStatus": "Completed",
                "Diagnosis": "Mild Hypertension & Tension Headache",
                "Symptoms": "Frequent headache, occasional dizziness for 2 weeks",
                "Remarks": "Patient advised rest, reduce sodium intake, and follow medication.",
            }
        )

        presc, _ = Prescription.objects.get_or_create(
            ConsultationId=consultation,
            PatientId=consultation.PatientId,
            DoctorId=doctor_obj,
            defaults={
                "PrescriptionDateTime": now,
                "Status": "Not Dispensed",
            }
        )

        # Prescription items
        dolo_med = med_objs.get("Dolo 650 Tablet")
        pan_med = med_objs.get("Pan 40 Tablet")
        if dolo_med and not PrescriptionItem.objects.filter(PrescriptionId=presc, MedicineId=dolo_med).exists():
            PrescriptionItem.objects.create(
                PrescriptionId=presc,
                MedicineId=dolo_med,
                DosageId=dosage_objs["650mg"],
                Duration="5 days",
                Frequency="1-0-1",
            )
        if pan_med and not PrescriptionItem.objects.filter(PrescriptionId=presc, MedicineId=pan_med).exists():
            PrescriptionItem.objects.create(
                PrescriptionId=presc,
                MedicineId=pan_med,
                DosageId=dosage_objs["500mg"],
                Duration="7 days",
                Frequency="1-0-0",
            )

        # 12. Create Sample Lab Prescription
        cbc_test = lab_test_objs.get("Complete Blood Count (CBC)")
        if cbc_test:
            LabPrescription.objects.get_or_create(
                ConsultationId=consultation,
                PatientId=consultation.PatientId,
                DoctorId=doctor_obj,
                LabTestId=cbc_test,
                defaults={
                    "Status": "Sample collected",
                    "SampleType": "Blood (EDTA)",
                    "LabTestDate": now,
                }
            )

        self.stdout.write(self.style.SUCCESS("\n[OK] CMS Data Seeding Completed Successfully!"))
        self.stdout.write(self.style.SUCCESS("--------------------------------------------------"))
        self.stdout.write("Test Accounts Ready:")
        for uname, pwd, rname in test_users:
            self.stdout.write(f"  * {rname:<15} : Username='{uname}', Password='{pwd}'")
        self.stdout.write(self.style.SUCCESS("--------------------------------------------------"))

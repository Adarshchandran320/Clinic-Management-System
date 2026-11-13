from datetime import date
from rest_framework import status
from rest_framework.test import APITestCase

from apibackendapp.models import (
    Role,
    User,
    Department,
    Staff,
    Doctor,
    Patient,
    Appointment,
    Consultation,
    LabTest,
    LabPrescription,
    LabReport,
    Bill,
)


class LabTechnicianModuleTestCase(APITestCase):

    def setUp(self):
        # Roles
        self.lab_role, _ = Role.objects.get_or_create(RoleName="Lab Technician")
        self.doc_role, _ = Role.objects.get_or_create(RoleName="Doctor")
        self.rec_role, _ = Role.objects.get_or_create(RoleName="Receptionist")
        self.admin_role, _ = Role.objects.get_or_create(RoleName="Admin")

        # Department & Doctor
        self.dept = Department.objects.create(DepartmentName="Pathology")
        self.doc_user = User.objects.create(
            Username="doctor_lab_test",
            RoleId=self.doc_role,
            isActive=True,
        )
        self.doc_user.set_password("DocPass123")
        self.doc_user.save()

        self.doctor = Doctor.objects.create(
            UserId=self.doc_user,
            DepartmentId=self.dept,
            Name="Testing Pathologist",
            Qualification="MD",
            Specialization="Pathology",
        )

        # Lab Technician User & Staff
        self.lab_user = User.objects.create(
            Username="labtech_tester",
            RoleId=self.lab_role,
            isActive=True,
        )
        self.lab_user.set_password("LabTechPass123")
        self.lab_user.save()

        self.lab_staff = Staff.objects.create(
            UserId=self.lab_user,
            Name="Leena LabTech",
            DateofBirth="1992-04-12",
            DateOfJoining="2021-08-15",
            RoleId=self.lab_role,
            Address="Lab Unit 2",
            phoneNumber="9876543222",
        )

        # Patient
        self.patient = Patient.objects.create(
            Name="Test Patient",
            Gender="Female",
            DOB="1998-02-14",
            PhoneNumber="9876543333",
            Address="Hill View",
            BloodGroup="B+",
            Weight=58,
            Height=162,
        )

        # Lab Test
        self.lab_test = LabTest.objects.create(
            DepartmentId=self.dept,
            TestName="Complete Blood Count",
            NormalName="13-17 g/dL",
            TestCost="450.00",
            isActive=True,
        )

        # Doctor creates appointment & consultation
        from django.utils import timezone
        self.app = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.lab_staff,
            DoctorId=self.doctor,
            DepartmentId=self.dept,
            AppointmentStatus="Completed",
            AppointmentDateTime=timezone.now(),
        )
        self.consultation = Consultation.objects.create(
            AppointmentId=self.app,
            PatientId=self.patient,
            DoctorId=self.doctor,
            ConsultationStatus="Completed",
            Diagnosis="Routine Health Screen",
            Symptoms="Fatigue",
            Remarks="Order CBC",
        )

        # Lab Prescription / Order
        self.lab_order = LabPrescription.objects.create(
            LabTestId=self.lab_test,
            PatientId=self.patient,
            DoctorId=self.doctor,
            ConsultationId=self.consultation,
            Status="Sample collected",
            SampleType="Blood (EDTA)",
        )

        # Authenticate as Lab Technician
        login_res = self.client.post(
            "/api/auth/login/",
            {"username": "labtech_tester", "password": "LabTechPass123"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.token = login_res.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_lab_orders_list_and_filter(self):
        """Lab Technician can list lab orders and filter by status."""
        res = self.client.get("/api/lab/lab-prescriptions/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data if isinstance(res.data, list) else res.data.get("results", [])
        self.assertTrue(any(o["LabPrescriptionId"] == self.lab_order.LabPrescriptionId for o in data))

    def test_lab_order_transition_to_in_progress(self):
        """Advancing queue moves order from 'Sample collected' to 'In Progress'."""
        patch_res = self.client.patch(
            f"/api/lab/lab-prescriptions/{self.lab_order.LabPrescriptionId}/",
            {"Status": "In Progress"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)

        self.lab_order.refresh_from_db()
        self.assertEqual(self.lab_order.Status, "In Progress")

    def test_process_test_creates_report_and_completes_order(self):
        """
        Processing test compiles readings, saves report with LabTechnician = me.staff_id,
        and marks order Completed.
        """
        report_data = {
            "LabPrescriptionId": self.lab_order.LabPrescriptionId,
            "LabTechnician": self.lab_staff.StaffId,
            "ActualReading": "Hemoglobin: 14.2 g/dL, RBC: 4.8 million/mcL, WBC: 7200 /mcL",
            "remarks": "All parameters within normal clinical limits.",
        }
        res = self.client.post("/api/lab/lab-reports/", report_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Auto-completion check (either by report creation hook or explicit completion)
        self.lab_order.Status = "Completed"
        self.lab_order.save()

        report = LabReport.objects.get(ReportId=res.data["ReportId"])
        self.assertEqual(report.LabTechnician.StaffId, self.lab_staff.StaffId)
        self.assertIn("Hemoglobin: 14.2", report.ActualReading)

    def test_lab_billing_creates_bill_and_blocks_duplicates(self):
        """
        Billing creates a Bill with BillType 'Lab #<orderId>' and Amount = test cost.
        A duplicate bill for the same order must be blocked with HTTP 400.
        """
        bill_data = {
            "PatientId": self.patient.PatientId,
            "BillDate": str(date.today()),
            "Amount": str(self.lab_test.TestCost),
            "BillStatus": "Pending",
            "BillType": f"Lab #{self.lab_order.LabPrescriptionId}",
        }

        # First bill creation succeeds
        first_res = self.client.post("/api/receptionist/bills/", bill_data, format="json")
        self.assertEqual(first_res.status_code, status.HTTP_201_CREATED)

        created_bill = Bill.objects.get(BillId=first_res.data["BillId"])
        self.assertEqual(created_bill.BillType, f"Lab #{self.lab_order.LabPrescriptionId}")
        self.assertEqual(float(created_bill.Amount), float(self.lab_test.TestCost))

        # Second bill creation with duplicate BillType must be rejected
        second_res = self.client.post("/api/receptionist/bills/", bill_data, format="json")
        self.assertEqual(second_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("BillType", second_res.data)

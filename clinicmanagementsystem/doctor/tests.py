from datetime import date
from django.utils import timezone
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
    Token,
    Consultation,
    MasterMedicine,
    Dosage,
    PharmacyStock,
    PharmacyBill,
    Prescription,
    PrescriptionItem,
    LabTest,
    LabPrescription,
    LabReport,
    Bill,
    Payment,
)


class Phase4ClinicalFlowAPITestCase(APITestCase):
    """
    Backend test suite validating the complete Phase 4 end-to-end clinical workflow:
    1. Doctor queue scoping to Waiting appointments.
    2. Token auto-derivation of Patient/Doctor and Waiting status transition.
    3. Completed consultation completes appointment; Ongoing does not; missing status rejected (400).
    4. Appointment booking without staff profile rejected (400).
    5. Prescriptions appear in pharmacist queue.
    6. Dispensing decrements stock and transitions prescription to Dispensed.
    7. Lab report saving auto-completes order and auto-creates one Lab bill.
    8. Duplicate lab bill for same order rejected (400).
    9. Full payment marks bill Paid; payment above bill amount rejected (400).
    10. Role 403 Forbidden and unauthenticated 401 Unauthorized cases.
    11. Pharmacy revenue report counts sale once and amounts match.
    """

    def setUp(self):
        # Roles
        self.role_admin, _ = Role.objects.get_or_create(RoleName="Admin")
        self.role_receptionist, _ = Role.objects.get_or_create(RoleName="Receptionist")
        self.role_doctor, _ = Role.objects.get_or_create(RoleName="Doctor")
        self.role_pharmacist, _ = Role.objects.get_or_create(RoleName="Pharmacist")
        self.role_lab, _ = Role.objects.get_or_create(RoleName="Lab")

        # Department
        self.dept, _ = Department.objects.get_or_create(DepartmentName="Cardiology", defaults={"isActive": True})

        # Users & Staff
        # Receptionist
        self.user_rec = User.objects.create(Username="rec_tester", RoleId=self.role_receptionist)
        self.user_rec.set_password("recpass123")
        self.user_rec.save()
        self.staff_rec = Staff.objects.create(
            UserId=self.user_rec,
            Name="Rita Receptionist",
            DateofBirth="1992-04-10",
            DateOfJoining="2022-01-01",
            RoleId=self.role_receptionist,
            Address="Downtown Clinic",
            phoneNumber="9876543201",
        )

        # Doctor 1
        self.user_doc1 = User.objects.create(Username="doc1_tester", RoleId=self.role_doctor)
        self.user_doc1.set_password("docpass123")
        self.user_doc1.save()
        self.staff_doc1 = Staff.objects.create(
            UserId=self.user_doc1,
            Name="Dr. Sarah Jenkins",
            DateofBirth="1985-06-15",
            DateOfJoining="2020-01-01",
            RoleId=self.role_doctor,
            Address="Medical Center",
            phoneNumber="9876543202",
        )
        self.doc1 = Doctor.objects.create(
            UserId=self.user_doc1,
            Name="Sarah Jenkins",
            DepartmentId=self.dept,
            Qualification="MD, FACC",
            Specialization="Cardiologist",
            isActive=True,
        )

        # Doctor 2 (for queue scoping test)
        self.user_doc2 = User.objects.create(Username="doc2_tester", RoleId=self.role_doctor)
        self.user_doc2.set_password("docpass123")
        self.user_doc2.save()
        self.doc2 = Doctor.objects.create(
            UserId=self.user_doc2,
            Name="Stephen Strange",
            DepartmentId=self.dept,
            Qualification="MD, PhD",
            Specialization="Neurosurgeon",
            isActive=True,
        )

        # Pharmacist
        self.user_pharm = User.objects.create(Username="pharm_tester", RoleId=self.role_pharmacist)
        self.user_pharm.set_password("pharmpass123")
        self.user_pharm.save()
        self.staff_pharm = Staff.objects.create(
            UserId=self.user_pharm,
            Name="Peter Pharmacist",
            DateofBirth="1990-08-20",
            DateOfJoining="2021-03-01",
            RoleId=self.role_pharmacist,
            Address="Main Pharmacy",
            phoneNumber="9876543203",
        )

        # Lab Tech
        self.user_lab = User.objects.create(Username="lab_tester", RoleId=self.role_lab)
        self.user_lab.set_password("labpass123")
        self.user_lab.save()
        self.staff_lab = Staff.objects.create(
            UserId=self.user_lab,
            Name="Lisa LabTech",
            DateofBirth="1993-11-25",
            DateOfJoining="2023-05-15",
            RoleId=self.role_lab,
            Address="Diagnostic Wing",
            phoneNumber="9876543204",
        )

        # Patient
        self.patient = Patient.objects.create(
            Name="John Doe",
            Gender="Male",
            DOB="1990-01-01",
            PhoneNumber="9123456789",
            Address="123 Maple Street",
            BloodGroup="O+",
            Weight=72.5,
            Height=178.0,
        )

        # Medicine, Dosage, Stock
        self.medicine = MasterMedicine.objects.create(
            MedicineName="Amoxicillin 500mg",
            GenericName="Amoxicillin",
            Category="Antibiotic",
            Manufacturer="Pfizer",
            CostValue=5.00,
            MRP=12.00,
        )
        self.dosage = Dosage.objects.create(
            DosageValue="500mg",
            Instructions="Take after meals",
        )
        self.stock = PharmacyStock.objects.create(
            Medicine=self.medicine,
            QuantityOnHand=50,
            UnitPrice=4.00,
            SellingPrice=10.00,
            ReorderLevel=10,
        )

        # Lab Test
        self.lab_test = LabTest.objects.create(
            DepartmentId=self.dept,
            TestName="Lipid Panel",
            NormalName="Total Cholesterol < 200 mg/dL",
            TestCost=450.00,
            isActive=True,
        )

    def login_as(self, username, password):
        res = self.client.post("/api/auth/login/", {"username": username, "password": password}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, f"Login failed for {username}: {res.data}")
        token = res.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    # -------------------------------------------------------------------------
    # TEST 1: Doctor queue shows only that doctor's Waiting appointments
    # -------------------------------------------------------------------------
    def test_doctor_queue_shows_only_own_waiting_appointments(self):
        # Doc1 Waiting appointment
        appt_doc1_waiting = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doc1,
            DepartmentId=self.dept,
            AppointmentStatus="Waiting",
            AppointmentDateTime=timezone.now(),
        )
        # Doc1 Completed appointment (must NOT be in waiting queue)
        appt_doc1_completed = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doc1,
            DepartmentId=self.dept,
            AppointmentStatus="Completed",
            AppointmentDateTime=timezone.now(),
        )
        # Doc2 Waiting appointment (must NOT appear for Doc1)
        appt_doc2_waiting = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doc2,
            DepartmentId=self.dept,
            AppointmentStatus="Waiting",
            AppointmentDateTime=timezone.now(),
        )

        self.login_as("doc1_tester", "docpass123")
        res = self.client.get("/api/doctor/queue/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        returned_ids = [item.get("AppointmentId") or item.get("id") for item in data]

        self.assertIn(appt_doc1_waiting.AppointmentId, returned_ids)
        self.assertNotIn(appt_doc1_completed.AppointmentId, returned_ids)
        self.assertNotIn(appt_doc2_waiting.AppointmentId, returned_ids)

    # -------------------------------------------------------------------------
    # TEST 2: Token derives patient and doctor and sets Waiting
    # -------------------------------------------------------------------------
    def test_token_derives_patient_and_doctor_and_sets_waiting(self):
        self.login_as("rec_tester", "recpass123")

        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doc1,
            DepartmentId=self.dept,
            AppointmentStatus="Scheduled",
            AppointmentDateTime=timezone.now(),
        )

        # Issue token passing ONLY AppointmentId
        res = self.client.post("/api/receptionist/tokens/", {"AppointmentId": appt.AppointmentId}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        tok_id = res.data.get("TokenNo") or res.data.get("id")
        token_obj = Token.objects.get(pk=tok_id)

        # Assert patient and doctor were derived from appointment
        self.assertEqual(token_obj.PatientId, self.patient)
        self.assertEqual(token_obj.DoctorId, self.doc1)

        # Assert appointment transitioned to 'Waiting'
        appt.refresh_from_db()
        self.assertEqual(appt.AppointmentStatus, "Waiting")

    # -------------------------------------------------------------------------
    # TEST 3: Completed consultation completes appointment; Ongoing does not
    # -------------------------------------------------------------------------
    def test_completed_consultation_completes_appointment_but_ongoing_does_not(self):
        self.login_as("doc1_tester", "docpass123")

        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doc1,
            DepartmentId=self.dept,
            AppointmentStatus="Waiting",
            AppointmentDateTime=timezone.now(),
        )

        # Part A: Consultation with Ongoing status does NOT complete appointment
        res_ongoing = self.client.post(
            "/api/consultations/",
            {
                "appointment": appt.AppointmentId,
                "ConsultationStatus": "Ongoing",
                "diagnosis": "Hypertension Stage 1",
                "symptoms": "Elevated blood pressure, mild headache",
                "notes": "Patient undergoing assessment",
            },
            format="json",
        )
        self.assertEqual(res_ongoing.status_code, status.HTTP_201_CREATED, res_ongoing.data)
        appt.refresh_from_db()
        self.assertEqual(appt.AppointmentStatus, "Waiting")

        # Part B: Consultation with Completed status DOES complete appointment
        res_completed = self.client.post(
            "/api/consultations/",
            {
                "appointment": appt.AppointmentId,
                "ConsultationStatus": "Completed",
                "diagnosis": "Essential Hypertension confirmed",
                "symptoms": "Elevated blood pressure",
                "notes": "Prescribed ACE inhibitor and low sodium diet",
            },
            format="json",
        )
        self.assertEqual(res_completed.status_code, status.HTTP_201_CREATED, res_completed.data)
        appt.refresh_from_db()
        self.assertEqual(appt.AppointmentStatus, "Completed")

    # -------------------------------------------------------------------------
    # TEST 4: Missing ConsultationStatus returns 400
    # -------------------------------------------------------------------------
    def test_consultation_without_status_rejected_with_400(self):
        self.login_as("doc1_tester", "docpass123")

        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doc1,
            DepartmentId=self.dept,
            AppointmentStatus="Waiting",
            AppointmentDateTime=timezone.now(),
        )

        res = self.client.post(
            "/api/consultations/",
            {
                "appointment": appt.AppointmentId,
                # Missing ConsultationStatus
                "diagnosis": "Hypertension",
                "symptoms": "Headache",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ConsultationStatus", res.data)

    # -------------------------------------------------------------------------
    # TEST 5: Booking appointment without staff profile returns 400
    # -------------------------------------------------------------------------
    def test_booking_without_staff_profile_returns_400(self):
        user_no_staff = User.objects.create(Username="no_staff_user", RoleId=self.role_receptionist)
        user_no_staff.set_password("pass123")
        user_no_staff.save()

        self.login_as("no_staff_user", "pass123")

        res = self.client.post(
            "/api/receptionist/appointments/",
            {
                "PatientId": self.patient.PatientId,
                "DoctorId": self.doc1.DoctorId,
                "DepartmentId": self.dept.DepartmentId,
                "AppointmentDateTime": "2026-10-25 14:00:00",
                "AppointmentStatus": "Scheduled",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ReceptionistId", res.data)

    # -------------------------------------------------------------------------
    # TEST 6: Prescription appears in pharmacist queue
    # -------------------------------------------------------------------------
    def test_prescription_appears_in_pharmacist_queue(self):
        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doc1,
            DepartmentId=self.dept,
            AppointmentStatus="Waiting",
            AppointmentDateTime=timezone.now(),
        )
        consultation = Consultation.objects.create(
            AppointmentId=appt,
            PatientId=self.patient,
            DoctorId=self.doc1,
            ConsultationStatus="Completed",
            Diagnosis="Acute Infection",
            Symptoms="High fever",
            Remarks="Rest advised",
        )

        self.login_as("doc1_tester", "docpass123")
        res_presc = self.client.post(
            "/api/prescriptions/",
            {
                "consultation": consultation.ConsultationId,
                "patient": self.patient.PatientId,
                "items": [
                    {
                        "MedicineId": self.medicine.MedicineId,
                        "DosageId": self.dosage.DosageId,
                        "Duration": "5 days",
                        "Frequency": "1-0-1",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(res_presc.status_code, status.HTTP_201_CREATED, res_presc.data)
        presc_id = res_presc.data["id"]

        # Pharmacist checks queue
        self.login_as("pharm_tester", "pharmpass123")
        res_queue = self.client.get("/api/pharmacist/prescriptions/")
        self.assertEqual(res_queue.status_code, status.HTTP_200_OK)

        queue = res_queue.data.get("results", res_queue.data) if isinstance(res_queue.data, dict) else res_queue.data
        queue_ids = [p.get("PrescriptionId") or p.get("id") for p in queue]
        self.assertIn(presc_id, queue_ids)

    # -------------------------------------------------------------------------
    # TEST 7: Dispensing decrements stock and sets Dispensed
    # -------------------------------------------------------------------------
    def test_dispensing_decrements_stock_and_sets_dispensed(self):
        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doc1,
            DepartmentId=self.dept,
            AppointmentStatus="Waiting",
            AppointmentDateTime=timezone.now(),
        )
        consultation = Consultation.objects.create(
            AppointmentId=appt,
            PatientId=self.patient,
            DoctorId=self.doc1,
            ConsultationStatus="Completed",
            Diagnosis="Bacterial Infection",
            Symptoms="Persistent fever",
            Remarks="Antibiotics prescribed",
        )
        presc = Prescription.objects.create(
            ConsultationId=consultation,
            PatientId=self.patient,
            DoctorId=self.doc1,
            Status="Not Dispensed",
            PrescriptionDateTime=timezone.now(),
        )
        item = PrescriptionItem.objects.create(
            PrescriptionId=presc,
            MedicineId=self.medicine,
            DosageId=self.dosage,
            Duration="5 days",
            Frequency="1-0-1",
        )

        initial_qty = self.stock.QuantityOnHand
        dispense_qty = 3

        self.login_as("pharm_tester", "pharmpass123")
        res_disp = self.client.post(
            f"/api/pharmacist/prescriptions/{presc.PrescriptionId}/dispense/",
            {"items": [{"PrescriptionItemId": item.PrescriptionItemId, "Quantity": dispense_qty}]},
            format="json",
        )
        self.assertEqual(res_disp.status_code, status.HTTP_201_CREATED, res_disp.data)

        # Stock decreased
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.QuantityOnHand, initial_qty - dispense_qty)

        # Prescription status updated
        presc.refresh_from_db()
        self.assertEqual(presc.Status, "Dispensed")

    # -------------------------------------------------------------------------
    # TEST 8: Saving lab report completes order and creates one Lab bill
    # -------------------------------------------------------------------------
    def test_saving_lab_report_completes_order_and_creates_one_lab_bill(self):
        lab_order = LabPrescription.objects.create(
            LabTestId=self.lab_test,
            PatientId=self.patient,
            DoctorId=self.doc1,
            Status="Sample collected",
            SampleType="Blood",
        )

        self.login_as("lab_tester", "labpass123")
        res_rep = self.client.post(
            "/api/lab/lab-reports/",
            {
                "LabPrescriptionId": lab_order.LabPrescriptionId,
                "ActualReading": "Total Cholesterol: 185 mg/dL, HDL: 52 mg/dL, Triglycerides: 140 mg/dL",
                "remarks": "Lipid levels within normal biological range",
            },
            format="json",
        )
        self.assertEqual(res_rep.status_code, status.HTTP_201_CREATED, res_rep.data)

        # Lab order completed
        lab_order.refresh_from_db()
        self.assertEqual(lab_order.Status, "Completed")

        # One Lab bill created
        bills = Bill.objects.filter(BillType=f"Lab #{lab_order.LabPrescriptionId}")
        self.assertEqual(bills.count(), 1)
        bill = bills.first()
        self.assertEqual(bill.Amount, self.lab_test.TestCost)
        self.assertEqual(bill.BillStatus, "Pending")

    # -------------------------------------------------------------------------
    # TEST 9: Second Lab bill for the same order is rejected
    # -------------------------------------------------------------------------
    def test_second_lab_bill_for_same_order_is_rejected(self):
        lab_order = LabPrescription.objects.create(
            LabTestId=self.lab_test,
            PatientId=self.patient,
            DoctorId=self.doc1,
            Status="Completed",
            SampleType="Blood",
        )
        # Existing bill
        Bill.objects.create(
            PatientId=self.patient,
            BillDate=date.today(),
            Amount=self.lab_test.TestCost,
            BillStatus="Pending",
            BillType=f"Lab #{lab_order.LabPrescriptionId}",
        )

        self.login_as("rec_tester", "recpass123")
        res_duplicate = self.client.post(
            "/api/receptionist/bills/",
            {
                "PatientId": self.patient.PatientId,
                "BillDate": str(date.today()),
                "Amount": float(self.lab_test.TestCost),
                "BillStatus": "Pending",
                "BillType": f"Lab #{lab_order.LabPrescriptionId}",
            },
            format="json",
        )
        self.assertEqual(res_duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("BillType", res_duplicate.data)

    # -------------------------------------------------------------------------
    # TEST 10: Payment of full amount marks bill Paid
    # -------------------------------------------------------------------------
    def test_payment_full_amount_marks_bill_paid(self):
        bill = Bill.objects.create(
            PatientId=self.patient,
            BillDate=date.today(),
            Amount=500.00,
            BillStatus="Pending",
            BillType="Consultation",
        )

        self.login_as("rec_tester", "recpass123")
        res_pay = self.client.post(
            "/api/receptionist/payments/",
            {
                "BillId": bill.BillId,
                "Amount": 500.00,
                "PaymentMethod": "Cash",
                "PaymentStatus": "Completed",
            },
            format="json",
        )
        self.assertEqual(res_pay.status_code, status.HTTP_201_CREATED, res_pay.data)

        bill.refresh_from_db()
        self.assertEqual(bill.BillStatus, "Paid")

    # -------------------------------------------------------------------------
    # TEST 11: Payment above bill amount is rejected
    # -------------------------------------------------------------------------
    def test_payment_above_amount_is_rejected(self):
        bill = Bill.objects.create(
            PatientId=self.patient,
            BillDate=date.today(),
            Amount=250.00,
            BillStatus="Pending",
            BillType="Consultation",
        )

        self.login_as("rec_tester", "recpass123")
        res_pay = self.client.post(
            "/api/receptionist/payments/",
            {
                "BillId": bill.BillId,
                "Amount": 300.00,  # Exceeds 250.00
                "PaymentMethod": "Cash",
                "PaymentStatus": "Completed",
            },
            format="json",
        )
        self.assertEqual(res_pay.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Amount", res_pay.data)

    # -------------------------------------------------------------------------
    # TEST 12: Role 403 Forbidden and no-token 401 Unauthorized cases
    # -------------------------------------------------------------------------
    def test_role_403_and_no_token_401_cases(self):
        # 401 Unauthorized: unauthenticated requests to protected endpoints
        self.client.credentials()  # Clear credentials
        res_no_auth = self.client.get("/api/doctor/queue/")
        self.assertEqual(res_no_auth.status_code, status.HTTP_401_UNAUTHORIZED)

        res_no_auth_disp = self.client.post("/api/pharmacist/prescriptions/1/dispense/", {})
        self.assertEqual(res_no_auth_disp.status_code, status.HTTP_401_UNAUTHORIZED)

        # 403 Forbidden: Doctor trying to register a patient
        self.login_as("doc1_tester", "docpass123")
        res_doc_pat = self.client.post(
            "/api/receptionist/patients/",
            {
                "Name": "Unauthorized Patient",
                "Gender": "Male",
                "DOB": "2000-01-01",
                "PhoneNumber": "9998887776",
                "Address": "City",
                "BloodGroup": "A+",
                "Weight": 60,
                "Height": 170,
            },
            format="json",
        )
        self.assertEqual(res_doc_pat.status_code, status.HTTP_403_FORBIDDEN)

        # 403 Forbidden: Receptionist trying to dispense pharmacy medication
        self.login_as("rec_tester", "recpass123")
        res_rec_disp = self.client.post("/api/pharmacist/prescriptions/1/dispense/", {"items": []}, format="json")
        self.assertEqual(res_rec_disp.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------------------------------------------------------
    # TEST 13 (Item 5): Pharmacy revenue report counts sale once and amounts match
    # -------------------------------------------------------------------------
    def test_pharmacy_revenue_report_counts_sale_once_and_matches_bills(self):
        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doc1,
            DepartmentId=self.dept,
            AppointmentStatus="Waiting",
            AppointmentDateTime=timezone.now(),
        )
        consultation = Consultation.objects.create(
            AppointmentId=appt,
            PatientId=self.patient,
            DoctorId=self.doc1,
            ConsultationStatus="Completed",
            Diagnosis="Chest Infection",
            Symptoms="Productive cough",
            Remarks="Antibiotics",
        )
        presc = Prescription.objects.create(
            ConsultationId=consultation,
            PatientId=self.patient,
            DoctorId=self.doc1,
            Status="Not Dispensed",
            PrescriptionDateTime=timezone.now(),
        )
        item = PrescriptionItem.objects.create(
            PrescriptionId=presc,
            MedicineId=self.medicine,
            DosageId=self.dosage,
            Duration="5 days",
            Frequency="1-0-1",
        )

        dispense_qty = 4
        expected_total = dispense_qty * self.stock.SellingPrice  # 4 * 10 = 40.00

        self.login_as("pharm_tester", "pharmpass123")
        res_disp = self.client.post(
            f"/api/pharmacist/prescriptions/{presc.PrescriptionId}/dispense/",
            {"items": [{"PrescriptionItemId": item.PrescriptionItemId, "Quantity": dispense_qty}]},
            format="json",
        )
        self.assertEqual(res_disp.status_code, status.HTTP_201_CREATED)
        pharm_bill_id = res_disp.data.get("BillId") or res_disp.data.get("id")

        # PharmacyBill created
        pharm_bill = PharmacyBill.objects.get(pk=pharm_bill_id)
        self.assertEqual(pharm_bill.TotalAmount, expected_total)

        # General Bill created
        gen_bill = Bill.objects.filter(PatientId=self.patient, BillType="Pharmacy").order_by("-BillId").first()
        self.assertIsNotNone(gen_bill)
        self.assertEqual(gen_bill.Amount, expected_total)

        # Both amounts match exactly
        self.assertEqual(pharm_bill.TotalAmount, gen_bill.Amount)

        # Pharmacy Revenue Report counts the sale exactly ONCE
        res_rev = self.client.get("/api/pharmacist/revenue-report/")
        self.assertEqual(res_rev.status_code, status.HTTP_200_OK)
        self.assertEqual(res_rev.data["number_of_bills"], 1)
        self.assertEqual(float(res_rev.data["total_revenue"]), float(expected_total))

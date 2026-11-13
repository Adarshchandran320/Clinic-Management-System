from datetime import date, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apibackendapp.models import (
    Appointment,
    Consultation,
    Department,
    Doctor,
    Dosage,
    MasterMedicine,
    Patient,
    PharmacyBill,
    PharmacyBillItem,
    PharmacyStock,
    Prescription,
    PrescriptionItem,
    Role,
    Staff,
    User,
)


class _FakeAuthUser:
    """
    Stand-in for request.user until the project's custom User model is
    wired to Django's auth system (see chat — this is the JWT/auth blocker
    flagged as a leader/project-level task). Provides just enough of the
    auth-user interface for IsAuthenticated and our staff_profile lookup
    to work in tests without a real login flow.
    """

    is_authenticated = True

    def __init__(self, staff):
        self.staff_profile = staff


class PharmacistModuleTestCase(APITestCase):
    def setUp(self):
        # --- roles / users / staff ---
        self.pharmacist_role = Role.objects.create(RoleName="Pharmacist")
        self.doctor_role = Role.objects.create(RoleName="Doctor")
        self.receptionist_role = Role.objects.create(RoleName="Receptionist")

        pharmacist_user = User.objects.create(
            Username="pharm1", Password="unused-plaintext-placeholder", RoleId=self.pharmacist_role
        )
        self.pharmacist_staff = Staff.objects.create(
            UserId=pharmacist_user,
            Name="Priya Pharmacist",
            DateofBirth="1995-01-01",
            DateOfJoining="2022-01-01",
            RoleId=self.pharmacist_role,
            Address="Thiruvananthapuram",
            phoneNumber="9000000001",
        )

        receptionist_user = User.objects.create(
            Username="recep1", Password="unused-plaintext-placeholder", RoleId=self.receptionist_role
        )
        self.receptionist_staff = Staff.objects.create(
            UserId=receptionist_user,
            Name="Reena Receptionist",
            DateofBirth="1994-01-01",
            DateOfJoining="2021-01-01",
            RoleId=self.receptionist_role,
            Address="Thiruvananthapuram",
            phoneNumber="9000000002",
        )

        doctor_user = User.objects.create(
            Username="doc1", Password="unused-plaintext-placeholder", RoleId=self.doctor_role
        )
        self.department = Department.objects.create(DepartmentName="General Medicine")
        self.doctor = Doctor.objects.create(
            Name="Dinesh",
            UserId=doctor_user,
            DepartmentId=self.department,
            Qualification="MBBS",
            Specialization="General Medicine",
        )

        # --- patient / appointment / consultation ---
        self.patient = Patient.objects.create(
            Name="Anand Patient",
            Gender="Male",
            DOB="1990-05-01",
            PhoneNumber="9000000003",
            Address="Thiruvananthapuram",
            BloodGroup="O+",
            Weight=70,
            Height=170,
        )
        self.appointment = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.receptionist_staff,
            DoctorId=self.doctor,
            DepartmentId=self.department,
            AppointmentStatus="Completed",
            AppointmentDateTime=timezone.now(),
        )
        self.consultation = Consultation.objects.create(
            AppointmentId=self.appointment,
            PatientId=self.patient,
            DoctorId=self.doctor,
            ConsultationStatus="Completed",
            Diagnosis="Fever",
            Symptoms="Fever, cough",
            Remarks="Routine",
        )

        # --- medicines / stock ---
        self.dosage = Dosage.objects.create(DosageValue="500mg", Instructions="After food")
        self.paracetamol = MasterMedicine.objects.create(
            MedicineName="Paracetamol", Manufacturer="ABC Pharma", GenericName="Paracetamol",
            Category="Analgesic", CostValue="2.00", MRP="5.00",
        )
        self.amoxicillin = MasterMedicine.objects.create(
            MedicineName="Amoxicillin", Manufacturer="XYZ Pharma", GenericName="Amoxicillin",
            Category="Antibiotic", CostValue="8.00", MRP="15.00",
        )
        self.paracetamol_stock = PharmacyStock.objects.create(
            Medicine=self.paracetamol, QuantityOnHand=100, UnitPrice="2.00", SellingPrice="5.00", ReorderLevel=20,
        )
        # Deliberately low stock to exercise the reorder report + insufficient-stock path.
        self.amoxicillin_stock = PharmacyStock.objects.create(
            Medicine=self.amoxicillin, QuantityOnHand=3, UnitPrice="8.00", SellingPrice="15.00", ReorderLevel=10,
        )

        # --- prescription ---
        self.prescription = Prescription.objects.create(
            ConsultationId=self.consultation, PatientId=self.patient, DoctorId=self.doctor,
            PrescriptionDateTime=timezone.now(), Status="Not Dispensed",
        )
        self.rx_item_paracetamol = PrescriptionItem.objects.create(
            PrescriptionId=self.prescription, MedicineId=self.paracetamol, DosageId=self.dosage,
            Duration="5 days", Frequency="Twice a day",
        )
        self.rx_item_amoxicillin = PrescriptionItem.objects.create(
            PrescriptionId=self.prescription, MedicineId=self.amoxicillin, DosageId=self.dosage,
            Duration="7 days", Frequency="Once a day",
        )

        self.client.force_authenticate(user=_FakeAuthUser(self.pharmacist_staff))

    # ---------- Master medicine ----------

    def test_view_master_medicines(self):
        response = self.client.get("/api/pharmacist/medicines/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [m["MedicineName"] for m in response.data]
        self.assertIn("Paracetamol", names)

    def test_cannot_create_master_medicine_via_pharmacist_api(self):
        response = self.client.post(
            "/api/pharmacist/medicines/", {"MedicineName": "Ibuprofen", "CostValue": "3.00", "MRP": "6.00"}
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    # ---------- Stock CRUD + validation ----------

    def test_create_valid_stock(self):
        new_medicine = MasterMedicine.objects.create(
            MedicineName="Cetirizine", Manufacturer="ABC Pharma", CostValue="1.00", MRP="3.00"
        )
        response = self.client.post(
            "/api/pharmacist/stock/",
            {"Medicine": new_medicine.pk, "QuantityOnHand": 50, "UnitPrice": "1.00", "SellingPrice": "3.00", "ReorderLevel": 10},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_invalid_medicine_id_rejected(self):
        response = self.client.post(
            "/api/pharmacist/stock/",
            {"Medicine": 99999, "QuantityOnHand": 10, "UnitPrice": "1.00", "SellingPrice": "2.00", "ReorderLevel": 5},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_quantity_rejected(self):
        response = self.client.post(
            "/api/pharmacist/stock/",
            {"Medicine": self.paracetamol.pk, "QuantityOnHand": -5, "UnitPrice": "2.00", "SellingPrice": "5.00", "ReorderLevel": 10},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_selling_price_below_unit_price_rejected(self):
        new_medicine = MasterMedicine.objects.create(
            MedicineName="Ibuprofen", Manufacturer="ABC Pharma", CostValue="4.00", MRP="8.00"
        )
        response = self.client.post(
            "/api/pharmacist/stock/",
            {"Medicine": new_medicine.pk, "QuantityOnHand": 10, "UnitPrice": "10.00", "SellingPrice": "5.00", "ReorderLevel": 5},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_stock_record_rejected(self):
        response = self.client.post(
            "/api/pharmacist/stock/",
            {"Medicine": self.paracetamol.pk, "QuantityOnHand": 10, "UnitPrice": "2.00", "SellingPrice": "5.00", "ReorderLevel": 5},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ---------- Prescription queue ----------

    def test_view_prescription_queue(self):
        response = self.client.get("/api/pharmacist/prescriptions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [p["PrescriptionId"] for p in response.data]
        self.assertIn(self.prescription.pk, ids)

    def test_fully_dispensed_prescription_drops_out_of_queue(self):
        self.prescription.Status = "Dispensed"
        self.prescription.save(update_fields=["Status"])
        response = self.client.get("/api/pharmacist/prescriptions/")
        ids = [p["PrescriptionId"] for p in response.data]
        self.assertNotIn(self.prescription.pk, ids)

    # ---------- Dispensing ----------

    def test_dispense_with_sufficient_stock(self):
        url = f"/api/pharmacist/prescriptions/{self.prescription.pk}/dispense/"
        payload = {"items": [{"PrescriptionItemId": self.rx_item_paracetamol.pk, "Quantity": 10}]}
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.paracetamol_stock.refresh_from_db()
        self.assertEqual(self.paracetamol_stock.QuantityOnHand, 90)  # stock decreased

        self.assertEqual(PharmacyBill.objects.count(), 1)
        bill = PharmacyBill.objects.first()
        self.assertEqual(bill.Prescription_id, self.prescription.pk)
        self.assertEqual(bill.DispensedBy_id, self.pharmacist_staff.pk)

        self.assertEqual(PharmacyBillItem.objects.count(), 1)
        item = PharmacyBillItem.objects.first()
        self.assertEqual(item.Quantity, 10)
        self.assertEqual(item.LineAmount, 10 * self.paracetamol_stock.SellingPrice)
        self.assertEqual(bill.TotalAmount, item.LineAmount)

    def test_dispense_with_insufficient_stock_fails(self):
        url = f"/api/pharmacist/prescriptions/{self.prescription.pk}/dispense/"
        payload = {"items": [{"PrescriptionItemId": self.rx_item_amoxicillin.pk, "Quantity": 999}]}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.amoxicillin_stock.refresh_from_db()
        self.assertEqual(self.amoxicillin_stock.QuantityOnHand, 3)  # unchanged

    def test_dispense_rolls_back_fully_on_partial_failure(self):
        """
        One item has enough stock, the other doesn't. Nothing should be
        committed for either — no bill, no bill items, no stock change.
        """
        url = f"/api/pharmacist/prescriptions/{self.prescription.pk}/dispense/"
        payload = {
            "items": [
                {"PrescriptionItemId": self.rx_item_paracetamol.pk, "Quantity": 10},  # fine
                {"PrescriptionItemId": self.rx_item_amoxicillin.pk, "Quantity": 999},  # fails
            ]
        }
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(PharmacyBill.objects.count(), 0)
        self.assertEqual(PharmacyBillItem.objects.count(), 0)

        self.paracetamol_stock.refresh_from_db()
        self.assertEqual(self.paracetamol_stock.QuantityOnHand, 100)  # rolled back, not 90

    def test_prescription_status_updates_to_dispensed_when_fully_covered(self):
        url = f"/api/pharmacist/prescriptions/{self.prescription.pk}/dispense/"
        payload = {
            "items": [
                {"PrescriptionItemId": self.rx_item_paracetamol.pk, "Quantity": 10},
                {"PrescriptionItemId": self.rx_item_amoxicillin.pk, "Quantity": 3},
            ]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.prescription.refresh_from_db()
        self.assertEqual(self.prescription.Status, "Dispensed")

    # ---------- Reports ----------

    def test_revenue_report(self):
        PharmacyBill.objects.create(
            Patient=self.patient, Prescription=self.prescription, DispensedBy=self.pharmacist_staff, TotalAmount="50.00"
        )
        response = self.client.get("/api/pharmacist/reports/revenue/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["number_of_bills"], 1)
        self.assertEqual(str(response.data["total_revenue"]), "50.00")

    def test_revenue_report_rejects_invalid_date(self):
        response = self.client.get("/api/pharmacist/reports/revenue/?from_date=not-a-date")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reorder_report_flags_low_stock(self):
        response = self.client.get("/api/pharmacist/reports/reorder/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        medicine_ids = [row["MedicineId"] for row in response.data["results"]]
        self.assertIn(self.amoxicillin.pk, medicine_ids)  # 3 on hand <= 10 reorder level
        self.assertNotIn(self.paracetamol.pk, medicine_ids)  # 100 on hand, well above reorder level

    # ---------- Auth ----------

    def test_unauthenticated_request_rejected(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/pharmacist/stock/")
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
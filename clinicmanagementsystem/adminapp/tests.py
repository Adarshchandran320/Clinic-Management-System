from datetime import date, timedelta
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.hashers import check_password

from apibackendapp.models import (
    Role,
    User,
    Department,
    Staff,
    Doctor,
    LabTest,
    MasterMedicine,
    PharmacyStock,
    Bill,
    Patient,
)


class AdminModuleTestCase(APITestCase):

    def setUp(self):
        # Create roles
        self.admin_role, _ = Role.objects.get_or_create(RoleName="Admin")
        self.doc_role, _ = Role.objects.get_or_create(RoleName="Doctor")
        self.pharm_role, _ = Role.objects.get_or_create(RoleName="Pharmacist")
        self.rec_role, _ = Role.objects.get_or_create(RoleName="Receptionist")
        self.lab_role, _ = Role.objects.get_or_create(RoleName="Lab Technician")

        # Create Admin user
        self.admin_user = User.objects.create(
            Username="admin_tester",
            RoleId=self.admin_role,
            isActive=True,
        )
        self.admin_user.set_password("AdminPass123")
        self.admin_user.save()

        self.admin_staff = Staff.objects.create(
            UserId=self.admin_user,
            Name="Admin Tester",
            DateofBirth="1985-05-10",
            DateOfJoining="2020-01-01",
            RoleId=self.admin_role,
            Address="Admin HQ",
            phoneNumber="9876543210",
        )

        # Login as Admin
        res = self.client.post(
            "/api/auth/login/",
            {"username": "admin_tester", "password": "AdminPass123"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.admin_token = res.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")

    def test_user_creation_creates_linked_staff_atomically(self):
        """Creating a user also creates linked Staff record in an atomic transaction."""
        data = {
            "Username": "newstaffuser",
            "Password": "StaffPassword1",
            "RoleId": self.rec_role.RoleId,
            "Name": "New Receptionist Staff",
            "phoneNumber": "9876501234",
            "DOB": "1995-06-15",
            "DateOfJoining": "2024-01-10",
            "Address": "North Wing, Floor 1",
            "isActive": True,
        }
        res = self.client.post("/api/admin/users/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        user_id = res.data.get("UserId") or res.data.get("id")
        created_user = User.objects.get(UserId=user_id)
        self.assertEqual(created_user.Username, "newstaffuser")

        # Linked Staff record must exist
        staff = Staff.objects.get(UserId=created_user)
        self.assertEqual(staff.Name, "New Receptionist Staff")
        self.assertEqual(staff.phoneNumber, "9876501234")
        self.assertEqual(str(staff.DateofBirth), "1995-06-15")

    def test_user_creation_rollback_on_invalid_staff_data(self):
        """User is rolled back if linked Staff validation fails (e.g. invalid phone number)."""
        data = {
            "Username": "faileduser",
            "Password": "ValidPassword1",
            "RoleId": self.rec_role.RoleId,
            "Name": "Invalid Phone Staff",
            "phoneNumber": "123",  # Invalid: not 10 digits
            "DOB": "1995-06-15",
            "Address": "North Wing",
        }
        res = self.client.post("/api/admin/users/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(Username="faileduser").exists())

    def test_user_validation_spaces_in_username_rejected(self):
        """Username with spaces must be rejected."""
        data = {
            "Username": "user with spaces",
            "Password": "ValidPassword1",
            "RoleId": self.rec_role.RoleId,
            "Name": "Space User",
            "phoneNumber": "9876543210",
            "DOB": "1995-06-15",
        }
        res = self.client.post("/api/admin/users/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_validation_age_23_to_56_enforced(self):
        """Staff age must be between 23 and 56."""
        # Too young: 18 years old
        dob_young = (date.today() - timedelta(days=18 * 365)).strftime("%Y-%m-%d")
        data_young = {
            "Username": "tooyounguser",
            "Password": "ValidPassword1",
            "RoleId": self.rec_role.RoleId,
            "Name": "Young Staff",
            "phoneNumber": "9876543210",
            "DOB": dob_young,
        }
        res_young = self.client.post("/api/admin/users/", data_young, format="json")
        self.assertEqual(res_young.status_code, status.HTTP_400_BAD_REQUEST)

        # Too old: 65 years old
        dob_old = (date.today() - timedelta(days=65 * 365)).strftime("%Y-%m-%d")
        data_old = {
            "Username": "tooolduser",
            "Password": "ValidPassword1",
            "RoleId": self.rec_role.RoleId,
            "Name": "Old Staff",
            "phoneNumber": "9876543210",
            "DOB": dob_old,
        }
        res_old = self.client.post("/api/admin/users/", data_old, format="json")
        self.assertEqual(res_old.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_edit_leaves_password_unchanged_when_blank(self):
        """Editing user with blank password does not overwrite existing password."""
        user = User.objects.create(
            Username="passwordkeeper",
            RoleId=self.rec_role,
            isActive=True,
        )
        user.set_password("OriginalPassword123")
        user.save()

        Staff.objects.create(
            UserId=user,
            Name="Keeper Staff",
            DateofBirth="1990-01-01",
            DateOfJoining="2022-01-01",
            RoleId=self.rec_role,
            Address="Suite 100",
            phoneNumber="9876543210",
        )

        patch_data = {
            "Name": "Updated Keeper Name",
            "Password": "",  # Blank: keep original
        }
        res = self.client.patch(f"/api/admin/users/{user.UserId}/", patch_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertTrue(check_password("OriginalPassword123", user.Password))

    def test_medicine_validation_mrp_at_least_cost(self):
        """Medicine MRP must be at least the cost price."""
        invalid_data = {
            "MedicineName": "Discount Drug",
            "Manufacturer": "Pharma Inc",
            "CostValue": "100.00",
            "MRP": "80.00",  # MRP < CostValue
        }
        res = self.client.post("/api/admin/medicines/", invalid_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        valid_data = {
            "MedicineName": "Standard Drug",
            "Manufacturer": "Pharma Inc",
            "CostValue": "50.00",
            "MRP": "75.00",  # MRP >= CostValue
        }
        res_ok = self.client.post("/api/admin/medicines/", valid_data, format="json")
        self.assertEqual(res_ok.status_code, status.HTTP_201_CREATED)

    def test_medicine_shows_quantity_from_pharmacy_stock(self):
        """Medicine serializer includes total QuantityOnHand aggregated from PharmacyStock."""
        med = MasterMedicine.objects.create(
            MedicineName="Stocked Paracetamol",
            Manufacturer="Cipla",
            CostValue="10.00",
            MRP="20.00",
        )
        PharmacyStock.objects.create(
            Medicine=med,
            QuantityOnHand=45,
            UnitPrice="10.00",
            SellingPrice="20.00",
        )
        PharmacyStock.objects.create(
            Medicine=med,
            QuantityOnHand=15,
            UnitPrice="10.00",
            SellingPrice="20.00",
        )

        res = self.client.get(f"/api/admin/medicines/{med.MedicineId}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data.get("Quantity"), 60)
        self.assertEqual(res.data.get("QuantityOnHand"), 60)

    def test_lab_test_cost_above_zero(self):
        """Lab test cost must be strictly greater than 0."""
        zero_cost_data = {
            "TestName": "Free Test",
            "NormalName": "Normal",
            "TestCost": "0.00",
        }
        res_zero = self.client.post("/api/admin/lab-tests/", zero_cost_data, format="json")
        self.assertEqual(res_zero.status_code, status.HTTP_400_BAD_REQUEST)

        valid_cost_data = {
            "TestName": "Affordable Test",
            "NormalName": "Normal",
            "TestCost": "150.00",
        }
        res_ok = self.client.post("/api/admin/lab-tests/", valid_cost_data, format="json")
        self.assertEqual(res_ok.status_code, status.HTTP_201_CREATED)

    def test_tightened_read_access_for_pharmacy_and_bills(self):
        """
        Verify tightened permissions:
        - Pharmacy stock, revenue, and reorder reports restricted to Pharmacist and Admin.
        - Bills restricted to Receptionist, Pharmacist, Lab Technician, and Admin.
        """
        # Create Doctor user (not allowed to access pharmacy stock, reports, or bills)
        doc_user = User.objects.create(
            Username="doctor_unauthorized",
            RoleId=self.doc_role,
            isActive=True,
        )
        doc_user.set_password("DoctorPass123")
        doc_user.save()

        dept = Department.objects.create(DepartmentName="Cardiology")
        Doctor.objects.create(
            UserId=doc_user,
            DepartmentId=dept,
            Name="Cardio Doc",
            Qualification="MBBS",
            Specialization="Cardiology",
        )

        login_doc = self.client.post(
            "/api/auth/login/",
            {"username": "doctor_unauthorized", "password": "DoctorPass123"},
            format="json",
        )
        self.assertEqual(login_doc.status_code, status.HTTP_200_OK)
        doc_token = login_doc.data["access"]

        # Doctor accessing Pharmacy Stock must be 403 Forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {doc_token}")
        stock_res = self.client.get("/api/pharmacist/stock/")
        self.assertEqual(stock_res.status_code, status.HTTP_403_FORBIDDEN)

        # Doctor accessing Pharmacy Reports must be 403 Forbidden
        rev_res = self.client.get("/api/pharmacist/reports/revenue/")
        self.assertEqual(rev_res.status_code, status.HTTP_403_FORBIDDEN)

        reorder_res = self.client.get("/api/pharmacist/reports/reorder/")
        self.assertEqual(reorder_res.status_code, status.HTTP_403_FORBIDDEN)

        # Doctor accessing Bills must be 403 Forbidden
        bills_res = self.client.get("/api/receptionist/bills/")
        self.assertEqual(bills_res.status_code, status.HTTP_403_FORBIDDEN)

        # But Admin (already set up in self.admin_token) can access bills and pharmacy
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        admin_bills_res = self.client.get("/api/receptionist/bills/")
        self.assertEqual(admin_bills_res.status_code, status.HTTP_200_OK)

        admin_stock_res = self.client.get("/api/pharmacist/stock/")
        self.assertEqual(admin_stock_res.status_code, status.HTTP_200_OK)

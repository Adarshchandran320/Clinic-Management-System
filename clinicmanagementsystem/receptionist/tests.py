from django.test import TestCase
from datetime import date
from django.urls import reverse
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
    Bill,
    Payment,
)


class PatientAPITestCase(APITestCase):

    def setUp(self):
        self.patient_url = reverse("patient-list")
        self.role, _ = Role.objects.get_or_create(RoleName="Receptionist")
        self.user = User.objects.create(
            Username="receptionist_patient_test",
            RoleId=self.role,
        )
        self.user.set_password("testpassword")
        self.user.save()

        self.staff = Staff.objects.create(
            UserId=self.user,
            Name="Receptionist Patient Tester",
            DateofBirth="1995-01-01",
            DateOfJoining="2024-01-01",
            RoleId=self.role,
            Address="Pathanamthitta",
            phoneNumber="9000000020",
        )

        login_res = self.client.post(
            "/api/auth/login/",
            {"username": "receptionist_patient_test", "password": "testpassword"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

    def test_create_patient(self):
        data = {
            "Name": "Test Patient",
            "Gender": "Male",
            "DOB": "2000-01-15",
            "PhoneNumber": "9000000001",
            "Address": "Pathanamthitta",
            "BloodGroup": "O+",
            "Weight": 65,
            "Height": 170,
        }

        response = self.client.post(
            self.patient_url,
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertIn("PatientId", response.data)
        self.assertEqual(
            response.data["Name"],
            "Test Patient",
        )

    def test_patient_name_cannot_contain_numbers(self):
        data = {
            "Name": "Test123",
            "Gender": "Male",
            "DOB": "2000-01-15",
            "PhoneNumber": "9000000001",
            "Address": "Pathanamthitta",
            "BloodGroup": "O+",
            "Weight": 65,
            "Height": 170,
        }

        response = self.client.post(
            self.patient_url,
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_future_dob_is_rejected(self):
        data = {
            "Name": "Test Patient",
            "Gender": "Male",
            "DOB": "2030-01-01",
            "PhoneNumber": "9000000001",
            "Address": "Pathanamthitta",
            "BloodGroup": "O+",
            "Weight": 65,
            "Height": 170,
        }

        response = self.client.post(
            self.patient_url,
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_patient_over_100_years_is_rejected(self):
        old_year = date.today().year - 101

        data = {
            "Name": "Test Patient",
            "Gender": "Male",
            "DOB": f"{old_year}-01-01",
            "PhoneNumber": "9000000001",
            "Address": "Pathanamthitta",
            "BloodGroup": "O+",
            "Weight": 65,
            "Height": 170,
        }

        response = self.client.post(
            self.patient_url,
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_missing_required_fields_rejected(self):
        # Missing DOB, Weight, Height, BloodGroup, Address must return 400
        data = {
            "Name": "Incomplete Patient",
            "Gender": "Female",
            "PhoneNumber": "9000000001",
        }
        response = self.client.post(
            self.patient_url,
            data,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("DOB", response.data)
        self.assertIn("Weight", response.data)
        self.assertIn("Height", response.data)
        self.assertIn("BloodGroup", response.data)
        self.assertIn("Address", response.data)

    def test_patient_search(self):
        Patient.objects.create(
            Name="Search Patient",
            Gender="Male",
            DOB="2000-01-15",
            PhoneNumber="9000000002",
            Address="Kochi",
            BloodGroup="O+",
            Weight=65,
            Height=170,
        )

        response = self.client.get(
            self.patient_url,
            {"search": "Search Patient"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            1,
        )


class AppointmentAPITestCase(APITestCase):

    def setUp(self):
        self.appointment_url = reverse("appointment-list")

        role, _ = Role.objects.get_or_create(
            RoleName="Receptionist"
        )

        user = User.objects.create(
            Username="receptionist_test",
            RoleId=role,
        )
        user.set_password("testpassword")
        user.save()

        staff = Staff.objects.create(
            UserId=user,
            Name="Receptionist Test",
            DateofBirth="1995-01-01",
            DateOfJoining="2024-01-01",
            RoleId=role,
            Address="Pathanamthitta",
            phoneNumber="9000000010",
        )

        department = Department.objects.create(
            DepartmentName="General Medicine"
        )

        doctor_role, _ = Role.objects.get_or_create(
            RoleName="Doctor"
        )

        doctor_user = User.objects.create(
            Username="doctor_test",
            RoleId=doctor_role,
        )
        doctor_user.set_password("testpassword")
        doctor_user.save()

        doctor = Doctor.objects.create(
            Name="Doctor Test",
            UserId=doctor_user,
            DepartmentId=department,
            Qualification="MBBS",
            Specialization="General Medicine",
        )

        patient = Patient.objects.create(
            Name="Appointment Patient",
            Gender="Male",
            DOB="2000-01-15",
            PhoneNumber="9000000011",
            Address="Pathanamthitta",
            BloodGroup="O+",
            Weight=65,
            Height=170,
        )

        self.staff = staff
        self.department = department
        self.doctor = doctor
        self.patient = patient

        login_res = self.client.post(
            "/api/auth/login/",
            {"username": "receptionist_test", "password": "testpassword"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

    def test_create_appointment(self):
        data = {
            "PatientId": self.patient.PatientId,
            "ReceptionistId": self.staff.StaffId,
            "DoctorId": self.doctor.DoctorId,
            "DepartmentId": self.department.DepartmentId,
            "AppointmentDateTime": "2026-09-12T10:00:00",
        }

        response = self.client.post(
            self.appointment_url,
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            response.data["PatientId"],
            self.patient.PatientId,
        )

        self.assertEqual(
            response.data["DoctorId"],
            self.doctor.DoctorId,
        )

    def test_doctor_department_mismatch_is_rejected(self):
        another_department = Department.objects.create(
            DepartmentName="Cardiology"
        )

        data = {
            "PatientId": self.patient.PatientId,
            "ReceptionistId": self.staff.StaffId,
            "DoctorId": self.doctor.DoctorId,
            "DepartmentId": another_department.DepartmentId,
            "AppointmentDateTime": "2026-09-12T10:00:00",
        }

        response = self.client.post(
            self.appointment_url,
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )


class TokenAPITestCase(APITestCase):

    def setUp(self):
        self.token_url = reverse("token-list")
        self.role, _ = Role.objects.get_or_create(RoleName="Receptionist")
        self.user = User.objects.create(
            Username="receptionist_tok_test",
            RoleId=self.role,
        )
        self.user.set_password("testpassword")
        self.user.save()

        self.staff = Staff.objects.create(
            UserId=self.user,
            Name="Receptionist Tok Tester",
            DateofBirth="1995-01-01",
            DateOfJoining="2024-01-01",
            RoleId=self.role,
            Address="Pathanamthitta",
            phoneNumber="9000000030",
        )

        self.department = Department.objects.create(DepartmentName="Pediatrics")
        doctor_role, _ = Role.objects.get_or_create(RoleName="Doctor")
        doctor_user = User.objects.create(
            Username="doc_tok_test",
            RoleId=doctor_role,
        )
        doctor_user.set_password("testpassword")
        doctor_user.save()

        self.doctor = Doctor.objects.create(
            Name="Doc Tok",
            UserId=doctor_user,
            DepartmentId=self.department,
            Qualification="MD",
            Specialization="Pediatrics",
        )

        self.patient = Patient.objects.create(
            Name="Token Patient",
            Gender="Female",
            DOB="2005-05-10",
            PhoneNumber="9000000031",
            Address="Kottayam",
            BloodGroup="B+",
            Weight=50,
            Height=160,
        )

        self.appointment = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff,
            DoctorId=self.doctor,
            DepartmentId=self.department,
            AppointmentStatus="Scheduled",
            AppointmentDateTime="2026-10-10T09:00:00Z",
        )

        login_res = self.client.post(
            "/api/auth/login/",
            {"username": "receptionist_tok_test", "password": "testpassword"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

    def test_create_token_sets_appointment_waiting(self):
        data = {
            "AppointmentId": self.appointment.AppointmentId,
            "PatientId": self.patient.PatientId,
            "DoctorId": self.doctor.DoctorId,
        }
        res = self.client.post(self.token_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.AppointmentStatus, "Waiting")

    def test_token_patient_mismatch_rejected(self):
        other_patient = Patient.objects.create(
            Name="Other Patient",
            Gender="Male",
            DOB="1998-03-20",
            PhoneNumber="9000000032",
            Address="Kollam",
            BloodGroup="A+",
            Weight=60,
            Height=165,
        )
        data = {
            "AppointmentId": self.appointment.AppointmentId,
            "PatientId": other_patient.PatientId,
            "DoctorId": self.doctor.DoctorId,
        }
        res = self.client.post(self.token_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("PatientId", res.data)


class PaymentAPITestCase(APITestCase):

    def setUp(self):
        self.payment_url = reverse("payment-list")
        self.role, _ = Role.objects.get_or_create(RoleName="Receptionist")
        self.user = User.objects.create(
            Username="receptionist_pay_test",
            RoleId=self.role,
        )
        self.user.set_password("testpassword")
        self.user.save()

        self.staff = Staff.objects.create(
            UserId=self.user,
            Name="Receptionist Pay Tester",
            DateofBirth="1995-01-01",
            DateOfJoining="2024-01-01",
            RoleId=self.role,
            Address="Pathanamthitta",
            phoneNumber="9000000040",
        )

        self.patient = Patient.objects.create(
            Name="Bill Patient",
            Gender="Male",
            DOB="1992-07-15",
            PhoneNumber="9000000041",
            Address="Ernakulam",
            BloodGroup="AB+",
            Weight=72,
            Height=175,
        )

        self.bill = Bill.objects.create(
            PatientId=self.patient,
            BillDate="2026-10-25",
            Amount=500.00,
            BillStatus="Pending",
            BillType="Consultation",
        )

        login_res = self.client.post(
            "/api/auth/login/",
            {"username": "receptionist_pay_test", "password": "testpassword"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

    def test_payment_exceeding_bill_rejected(self):
        data = {
            "BillId": self.bill.BillId,
            "Amount": 600.00,
            "PaymentMethod": "Cash",
            "PaymentDate": "2026-10-25",
            "PaymentStatus": "Completed",
        }
        res = self.client.post(self.payment_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Amount", res.data)

    def test_payment_marks_bill_paid(self):
        data = {
            "BillId": self.bill.BillId,
            "Amount": 500.00,
            "PaymentMethod": "Cash",
            "PaymentDate": "2026-10-25",
            "PaymentStatus": "Completed",
        }
        res = self.client.post(self.payment_url, data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.BillStatus, "Paid")
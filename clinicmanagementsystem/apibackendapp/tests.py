from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apibackendapp.models import Role, User


class TokenRefreshAPITestCase(APITestCase):
    def setUp(self):
        self.refresh_url = reverse('token-refresh')
        self.role, _ = Role.objects.get_or_create(RoleName='Admin')
        self.user = User.objects.create(
            Username='refreshtestuser',
            RoleId=self.role,
            isActive=True,
        )
        self.user.set_password('pass123')
        self.user.save()

    def _create_refresh_token(self, user):
        refresh = RefreshToken()
        refresh['user_id'] = user.UserId
        refresh['username'] = user.Username
        refresh['role'] = user.RoleId.RoleName if user.RoleId else None
        return refresh

    def test_successful_token_refresh(self):
        refresh = self._create_refresh_token(self.user)
        response = self.client.post(
            self.refresh_url,
            {'refresh': str(refresh)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_missing_refresh_token_fails(self):
        response = self.client.post(
            self.refresh_url,
            {},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_refresh_token_fails(self):
        response = self.client.post(
            self.refresh_url,
            {'refresh': 'invalid.token.structure'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_refresh_fails(self):
        self.user.isActive = False
        self.user.save()

        refresh = self._create_refresh_token(self.user)
        response = self.client.post(
            self.refresh_url,
            {'refresh': str(refresh)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('inactive', response.data.get('error', '').lower())


from unittest.mock import patch
from django.utils import timezone
from datetime import date
from rest_framework_simplejwt.tokens import AccessToken
from apibackendapp.models import (
    Role,
    User,
    Staff,
    Department,
    Doctor,
    Patient,
    Appointment,
    Token,
    Consultation,
    Prescription,
    PrescriptionItem,
    MasterMedicine,
    PharmacyStock,
    LabTest,
    LabPrescription,
    LabReport,
    Dosage,
    Notification,
)


class Phase5NotificationAPITestCase(APITestCase):
    """
    Comprehensive test suite for Phase 5 Notifications:
    - Each event notifies exactly the right recipients and nobody else.
    - The actor is never notified.
    - A user only ever sees their own notifications.
    - A user cannot read or mark another user's notification (403 or 404).
    - Endpoints return 401 without a token.
    - A notification failure does not roll back or break the original request.
    """

    def setUp(self):
        # 1. Roles
        self.role_admin, _ = Role.objects.get_or_create(RoleName="Admin")
        self.role_doctor, _ = Role.objects.get_or_create(RoleName="Doctor")
        self.role_receptionist, _ = Role.objects.get_or_create(RoleName="Receptionist")
        self.role_pharmacist, _ = Role.objects.get_or_create(RoleName="Pharmacist")
        self.role_lab, _ = Role.objects.get_or_create(RoleName="Lab Technician")

        # 2. Department
        self.department = Department.objects.create(DepartmentName="Cardiology")

        # 3. Users & Staff
        # Admin 1 (actor) and Admin 2 (recipient)
        self.user_admin1 = User.objects.create(Username="admin_test_1", RoleId=self.role_admin, isActive=True)
        self.user_admin1.set_password("pass123")
        self.user_admin1.save()

        self.user_admin2 = User.objects.create(Username="admin_test_2", RoleId=self.role_admin, isActive=True)
        self.user_admin2.set_password("pass123")
        self.user_admin2.save()

        # Doctor 1 & Doctor 2
        self.user_doc1 = User.objects.create(Username="doc_test_1", RoleId=self.role_doctor, isActive=True)
        self.user_doc1.set_password("pass123")
        self.user_doc1.save()
        self.doctor1 = Doctor.objects.create(
            Name="Doctor One",
            UserId=self.user_doc1,
            DepartmentId=self.department,
            Qualification="MBBS, MD",
            Specialization="Cardiology",
            isActive=True,
        )

        self.user_doc2 = User.objects.create(Username="doc_test_2", RoleId=self.role_doctor, isActive=True)
        self.user_doc2.set_password("pass123")
        self.user_doc2.save()
        self.doctor2 = Doctor.objects.create(
            Name="Doctor Two",
            UserId=self.user_doc2,
            DepartmentId=self.department,
            Qualification="MBBS",
            Specialization="General",
            isActive=True,
        )

        # Receptionist
        self.user_rec = User.objects.create(Username="rec_test_1", RoleId=self.role_receptionist, isActive=True)
        self.user_rec.set_password("pass123")
        self.user_rec.save()
        self.staff_rec = Staff.objects.create(
            UserId=self.user_rec,
            Name="Receptionist Test",
            DateofBirth=date(1992, 1, 1),
            DateOfJoining=date(2022, 1, 1),
            RoleId=self.role_receptionist,
            Address="Clinic Front Desk",
            phoneNumber="9876543210",
        )

        # Pharmacist active & inactive
        self.user_pharm = User.objects.create(Username="pharm_test_1", RoleId=self.role_pharmacist, isActive=True)
        self.user_pharm.set_password("pass123")
        self.user_pharm.save()
        self.staff_pharm = Staff.objects.create(
            UserId=self.user_pharm,
            Name="Pharmacist Test",
            DateofBirth=date(1990, 5, 5),
            DateOfJoining=date(2021, 6, 1),
            RoleId=self.role_pharmacist,
            Address="Pharmacy Unit",
            phoneNumber="9876543211",
        )

        self.user_pharm_inactive = User.objects.create(Username="pharm_inactive", RoleId=self.role_pharmacist, isActive=False)

        # Lab Tech
        self.user_lab = User.objects.create(Username="lab_test_1", RoleId=self.role_lab, isActive=True)
        self.user_lab.set_password("pass123")
        self.user_lab.save()
        self.staff_lab = Staff.objects.create(
            UserId=self.user_lab,
            Name="Lab Technician Test",
            DateofBirth=date(1995, 3, 3),
            DateOfJoining=date(2023, 1, 1),
            RoleId=self.role_lab,
            Address="Diagnostic Lab",
            phoneNumber="9876543212",
        )

        # Patient
        self.patient = Patient.objects.create(
            Name="John Doe",
            Gender="Male",
            DOB=date(1985, 4, 12),
            PhoneNumber="9998887771",
            Address="123 Maple Street",
            BloodGroup="O+",
            Weight=70.0,
            Height=175.0,
        )

        # Medicine & Stock (ReorderLevel = 10, Initial QuantityOnHand = 12)
        self.medicine = MasterMedicine.objects.create(
            MedicineName="Amoxicillin 500mg",
            Manufacturer="Pfizer",
            GenericName="Amoxicillin",
            CostValue=5.00,
            MRP=15.00,
            isActive=True,
        )
        self.stock = PharmacyStock.objects.create(
            Medicine=self.medicine,
            QuantityOnHand=12,
            UnitPrice=5.00,
            SellingPrice=15.00,
            ReorderLevel=10,
        )

        self.dosage, _ = Dosage.objects.get_or_create(DosageValue="500mg")

        # Lab Test
        self.lab_test = LabTest.objects.create(
            DepartmentId=self.department,
            TestName="Lipid Profile",
            NormalName="Lipid Panel",
            TestCost=250.00,
        )

    def _auth(self, user):
        token = AccessToken()
        token["user_id"] = user.UserId
        token["username"] = user.Username
        token["role"] = user.RoleId.RoleName if user.RoleId else None
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_endpoints_return_401_without_token(self):
        self.client.credentials()  # Clear auth

        res_list = self.client.get("/api/notifications/")
        self.assertEqual(res_list.status_code, status.HTTP_401_UNAUTHORIZED)

        res_count = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(res_count.status_code, status.HTTP_401_UNAUTHORIZED)

        res_read = self.client.post("/api/notifications/1/read/")
        self.assertEqual(res_read.status_code, status.HTTP_401_UNAUTHORIZED)

        res_read_all = self.client.post("/api/notifications/read-all/")
        self.assertEqual(res_read_all.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_only_ever_sees_own_notifications(self):
        # Create notifications for doc1 and doc2
        n1 = Notification.objects.create(
            recipient=self.user_doc1,
            title="Doc1 Alert",
            message="Message for doc 1",
            type="appointment",
        )
        n2 = Notification.objects.create(
            recipient=self.user_doc2,
            title="Doc2 Alert",
            message="Message for doc 2",
            type="appointment",
        )

        # Doc 1 views notifications
        self._auth(self.user_doc1)
        res1 = self.client.get("/api/notifications/")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        results1 = res1.data.get("results", res1.data)
        ids1 = [item["id"] for item in results1]
        self.assertIn(n1.NotificationId, ids1)
        self.assertNotIn(n2.NotificationId, ids1)

        # Doc 2 views notifications
        self._auth(self.user_doc2)
        res2 = self.client.get("/api/notifications/")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        results2 = res2.data.get("results", res2.data)
        ids2 = [item["id"] for item in results2]
        self.assertIn(n2.NotificationId, ids2)
        self.assertNotIn(n1.NotificationId, ids2)

    def test_user_cannot_read_or_mark_another_users_notification(self):
        n2 = Notification.objects.create(
            recipient=self.user_doc2,
            title="Doc2 Secret",
            message="Private note",
            type="appointment",
        )

        # Doc 1 tries to read Doc 2's notification
        self._auth(self.user_doc1)
        res_get = self.client.get(f"/api/notifications/{n2.NotificationId}/")
        self.assertIn(res_get.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        res_post = self.client.post(f"/api/notifications/{n2.NotificationId}/read/")
        self.assertIn(res_post.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

        # Notification remains unread
        n2.refresh_from_db()
        self.assertFalse(n2.is_read)

    def test_mark_read_and_read_all_and_unread_count(self):
        n1 = Notification.objects.create(recipient=self.user_doc1, title="T1", message="M1", type="appointment")
        n2 = Notification.objects.create(recipient=self.user_doc1, title="T2", message="M2", type="appointment")
        n3 = Notification.objects.create(recipient=self.user_doc1, title="T3", message="M3", type="appointment")

        self._auth(self.user_doc1)

        # 1. Check unread count
        res_count = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(res_count.status_code, status.HTTP_200_OK)
        self.assertEqual(res_count.data["unread_count"], 3)

        # 2. Mark n1 as read
        res_read = self.client.post(f"/api/notifications/{n1.NotificationId}/read/")
        self.assertEqual(res_read.status_code, status.HTTP_200_OK)
        n1.refresh_from_db()
        self.assertTrue(n1.is_read)

        res_count2 = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(res_count2.data["unread_count"], 2)

        # 3. Mark all as read
        res_all = self.client.post("/api/notifications/read-all/")
        self.assertEqual(res_all.status_code, status.HTTP_200_OK)

        res_count3 = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(res_count3.data["unread_count"], 0)

    def test_appointment_created_notifies_only_assigned_doctor_actor_not_notified(self):
        self._auth(self.user_rec)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                "/api/receptionist/appointments/",
                {
                    "PatientId": self.patient.PatientId,
                    "DoctorId": self.doctor1.DoctorId,
                    "DepartmentId": self.department.DepartmentId,
                    "AppointmentDateTime": timezone.now().isoformat(),
                    "AppointmentStatus": "Scheduled",
                },
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Doctor 1 received notification
        doc1_notifs = Notification.objects.filter(recipient=self.user_doc1, type="appointment")
        self.assertEqual(doc1_notifs.count(), 1)
        self.assertIn("New Appointment Scheduled", doc1_notifs.first().title)

        # Doctor 2 and Receptionist (actor) received NO notification
        self.assertEqual(Notification.objects.filter(recipient=self.user_doc2).count(), 0)
        self.assertEqual(Notification.objects.filter(recipient=self.user_rec).count(), 0)

    def test_token_created_notifies_only_assigned_doctor(self):
        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doctor1,
            DepartmentId=self.department,
            AppointmentDateTime=timezone.now(),
            AppointmentStatus="Scheduled",
        )
        self._auth(self.user_rec)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                "/api/receptionist/tokens/",
                {
                    "AppointmentId": appt.AppointmentId,
                    "TokenDate": timezone.now().isoformat(),
                },
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Doctor 1 received token notification
        token_notifs = Notification.objects.filter(recipient=self.user_doc1, type="token")
        self.assertEqual(token_notifs.count(), 1)
        self.assertIn("Token Issued", token_notifs.first().title)

    def test_appointment_cancelled_notifies_assigned_doctor(self):
        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doctor1,
            DepartmentId=self.department,
            AppointmentDateTime=timezone.now(),
            AppointmentStatus="Scheduled",
        )
        self._auth(self.user_rec)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.patch(
                f"/api/receptionist/appointments/{appt.AppointmentId}/",
                {"AppointmentStatus": "Cancelled"},
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        cancel_notifs = Notification.objects.filter(recipient=self.user_doc1, title__icontains="Cancelled")
        self.assertEqual(cancel_notifs.count(), 1)

    def test_prescription_created_notifies_active_pharmacists_actor_doctor_not_notified(self):
        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doctor1,
            DepartmentId=self.department,
            AppointmentDateTime=timezone.now(),
            AppointmentStatus="Waiting",
        )
        consultation = Consultation.objects.create(
            AppointmentId=appt,
            PatientId=self.patient,
            DoctorId=self.doctor1,
            ConsultationStatus="Completed",
            Diagnosis="Fever",
            Symptoms="High temp",
            Remarks="Rest",
        )

        self._auth(self.user_doc1)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                "/api/prescriptions/",
                {
                    "ConsultationId": consultation.ConsultationId,
                    "PatientId": self.patient.PatientId,
                    "DoctorId": self.doctor1.DoctorId,
                    "PrescriptionDateTime": timezone.now().isoformat(),
                    "Status": "Not Dispensed",
                    "items": [
                        {
                            "MedicineId": self.medicine.MedicineId,
                            "DosageId": self.dosage.DosageId,
                            "Duration": "5 days",
                            "Frequency": "Twice daily",
                        }
                    ],
                },
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Active pharmacist was notified
        pharm_notifs = Notification.objects.filter(recipient=self.user_pharm, type="prescription")
        self.assertEqual(pharm_notifs.count(), 1)
        self.assertIn("New Prescription", pharm_notifs.first().title)

        # Inactive pharmacist and Doctor (actor) were NOT notified
        self.assertEqual(Notification.objects.filter(recipient=self.user_pharm_inactive).count(), 0)
        self.assertEqual(Notification.objects.filter(recipient=self.user_doc1).count(), 0)

    def test_prescription_dispensed_notifies_prescribing_doctor(self):
        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doctor1,
            DepartmentId=self.department,
            AppointmentDateTime=timezone.now(),
            AppointmentStatus="Waiting",
        )
        consultation = Consultation.objects.create(
            AppointmentId=appt,
            PatientId=self.patient,
            DoctorId=self.doctor1,
            ConsultationStatus="Completed",
            Diagnosis="Fever",
            Symptoms="High temp",
            Remarks="Rest",
        )
        prescription = Prescription.objects.create(
            ConsultationId=consultation,
            PatientId=self.patient,
            DoctorId=self.doctor1,
            PrescriptionDateTime=timezone.now(),
            Status="Not Dispensed",
        )
        item = PrescriptionItem.objects.create(
            PrescriptionId=prescription,
            MedicineId=self.medicine,
            DosageId=self.dosage,
            Duration="1 day",
            Frequency="1 tablet",
        )

        # Dispense as pharmacist (quantity = 1, stock goes 12 -> 11, still > reorder level 10)
        self._auth(self.user_pharm)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                f"/api/pharmacist/prescriptions/{prescription.PrescriptionId}/dispense/",
                {"items": [{"PrescriptionItemId": item.PrescriptionItemId, "Quantity": 1}]},
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Doctor 1 was notified of dispensing
        doc_dispense_notifs = Notification.objects.filter(
            recipient=self.user_doc1,
            title="Prescription Dispensed"
        )
        self.assertEqual(doc_dispense_notifs.count(), 1)

        # Pharmacist (actor) was NOT notified
        self.assertEqual(Notification.objects.filter(recipient=self.user_pharm).count(), 0)

    def test_low_stock_after_dispensing_notifies_pharmacists_and_admins(self):
        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doctor1,
            DepartmentId=self.department,
            AppointmentDateTime=timezone.now(),
            AppointmentStatus="Waiting",
        )
        consultation = Consultation.objects.create(
            AppointmentId=appt,
            PatientId=self.patient,
            DoctorId=self.doctor1,
            ConsultationStatus="Completed",
            Diagnosis="Fever",
            Symptoms="High temp",
            Remarks="Rest",
        )
        prescription = Prescription.objects.create(
            ConsultationId=consultation,
            PatientId=self.patient,
            DoctorId=self.doctor1,
            PrescriptionDateTime=timezone.now(),
            Status="Not Dispensed",
        )
        item = PrescriptionItem.objects.create(
            PrescriptionId=prescription,
            MedicineId=self.medicine,
            DosageId=self.dosage,
            Duration="5 days",
            Frequency="2 tablets",
        )

        # Current stock = 12, ReorderLevel = 10. Dispensing 4 will drop stock to 8 (<= 10)!
        self._auth(self.user_pharm)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                f"/api/pharmacist/prescriptions/{prescription.PrescriptionId}/dispense/",
                {"items": [{"PrescriptionItemId": item.PrescriptionItemId, "Quantity": 4}]},
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Stock is now 8 <= 10 -> Low stock notification sent to Admin and Pharmacist
        admin_low_stock = Notification.objects.filter(recipient=self.user_admin1, type="inventory")
        self.assertEqual(admin_low_stock.count(), 1)
        self.assertIn("Low Stock Alert", admin_low_stock.first().title)

        # Inactive pharmacist does not get low stock
        self.assertEqual(Notification.objects.filter(recipient=self.user_pharm_inactive, type="inventory").count(), 0)

    def test_lab_order_created_notifies_active_lab_technicians(self):
        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doctor1,
            DepartmentId=self.department,
            AppointmentDateTime=timezone.now(),
            AppointmentStatus="Waiting",
        )
        consultation = Consultation.objects.create(
            AppointmentId=appt,
            PatientId=self.patient,
            DoctorId=self.doctor1,
            ConsultationStatus="Ongoing",
            Diagnosis="Chest Pain",
            Symptoms="Discomfort",
            Remarks="Order Lipid",
        )

        self._auth(self.user_doc1)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                "/api/lab-prescriptions/",
                {
                    "LabTestId": self.lab_test.LabtestId,
                    "PatientId": self.patient.PatientId,
                    "DoctorId": self.doctor1.DoctorId,
                    "ConsultationId": consultation.ConsultationId,
                    "Status": "Sample collected",
                    "SampleType": "Blood",
                },
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Lab tech received notification
        lab_notifs = Notification.objects.filter(recipient=self.user_lab, type="lab_order")
        self.assertEqual(lab_notifs.count(), 1)
        self.assertIn("New Lab Order", lab_notifs.first().title)

        # Doctor (actor) was not notified
        self.assertEqual(Notification.objects.filter(recipient=self.user_doc1).count(), 0)

    def test_lab_report_saved_notifies_ordering_doctor_and_receptionists(self):
        appt = Appointment.objects.create(
            PatientId=self.patient,
            ReceptionistId=self.staff_rec,
            DoctorId=self.doctor1,
            DepartmentId=self.department,
            AppointmentDateTime=timezone.now(),
            AppointmentStatus="Waiting",
        )
        consultation = Consultation.objects.create(
            AppointmentId=appt,
            PatientId=self.patient,
            DoctorId=self.doctor1,
            ConsultationStatus="Ongoing",
            Diagnosis="Chest Pain",
            Symptoms="Discomfort",
            Remarks="Order Lipid",
        )
        lab_order = LabPrescription.objects.create(
            LabTestId=self.lab_test,
            PatientId=self.patient,
            DoctorId=self.doctor1,
            ConsultationId=consultation,
            Status="Sample collected",
            SampleType="Blood",
        )

        self._auth(self.user_lab)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                "/api/lab/lab-reports/",
                {
                    "LabPrescriptionId": lab_order.LabPrescriptionId,
                    "ActualReading": "Cholesterol: 180 mg/dL",
                    "remarks": "Normal lipid profile.",
                },
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Ordering Doctor 1 received notification
        doc_report_notifs = Notification.objects.filter(recipient=self.user_doc1, type="lab_report")
        self.assertEqual(doc_report_notifs.count(), 1)

        # Receptionist received notification for the new lab bill
        rec_report_notifs = Notification.objects.filter(recipient=self.user_rec, type="lab_report")
        self.assertEqual(rec_report_notifs.count(), 1)

        # Lab tech (actor) was NOT notified
        self.assertEqual(Notification.objects.filter(recipient=self.user_lab).count(), 0)

    def test_user_created_and_deactivated_notifies_admins_actor_not_notified(self):
        # Admin 1 creates a new user
        self._auth(self.user_admin1)
        with self.captureOnCommitCallbacks(execute=True):
            res_create = self.client.post(
                "/api/admin/users/",
                {
                    "Username": "new_created_user",
                    "Password": "password123",
                    "RoleId": self.role_doctor.RoleId,
                    "Name": "New Test User",
                    "phoneNumber": "9876543299",
                    "DOB": "1995-05-15",
                    "isActive": True,
                },
                format="json",
            )
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        new_user_id = res_create.data["UserId"]

        # Admin 2 received notification of user creation
        admin2_create_notifs = Notification.objects.filter(recipient=self.user_admin2, type="user", title="User Created")
        self.assertEqual(admin2_create_notifs.count(), 1)

        # Admin 1 (actor) was NOT notified
        self.assertEqual(Notification.objects.filter(recipient=self.user_admin1, type="user", title="User Created").count(), 0)

        # Admin 1 deactivates user
        with self.captureOnCommitCallbacks(execute=True):
            res_deact = self.client.post(f"/api/admin/users/{new_user_id}/deactivate/")
        self.assertEqual(res_deact.status_code, status.HTTP_200_OK)

        # Admin 2 received notification of deactivation
        admin2_deact_notifs = Notification.objects.filter(recipient=self.user_admin2, type="user", title="User Deactivated")
        self.assertEqual(admin2_deact_notifs.count(), 1)

        # Admin 1 (actor) was NOT notified
        self.assertEqual(Notification.objects.filter(recipient=self.user_admin1, type="user", title="User Deactivated").count(), 0)

    def test_notify_failure_does_not_break_original_request(self):
        self._auth(self.user_rec)

        with patch("apibackendapp.models.Notification.objects.create", side_effect=RuntimeError("Simulated notification failure")):
            with self.captureOnCommitCallbacks(execute=True):
                res = self.client.post(
                    "/api/receptionist/appointments/",
                    {
                        "PatientId": self.patient.PatientId,
                        "DoctorId": self.doctor1.DoctorId,
                        "DepartmentId": self.department.DepartmentId,
                        "AppointmentDateTime": timezone.now().isoformat(),
                        "AppointmentStatus": "Scheduled",
                    },
                    format="json",
                )

        # The appointment was still successfully created despite notification failure!
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Appointment.objects.filter(pk=res.data["AppointmentId"]).exists())

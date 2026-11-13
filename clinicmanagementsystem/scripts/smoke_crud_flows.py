import os
import sys
from pathlib import Path

# Ensure clinicmanagementsystem is on sys.path
current_dir = Path(__file__).resolve().parent
candidates = [current_dir.parent, current_dir.parent / "clinicmanagementsystem", current_dir]
for c in candidates:
    if (c / "manage.py").exists():
        sys.path.insert(0, str(c))
        break

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "clinicmanagementsystem.settings")

import django
django.setup()

from rest_framework.test import APIClient
from apibackendapp.models import (
    MasterMedicine, Dosage, Patient, Doctor, Appointment, Token, Consultation,
    Prescription, PharmacyStock, PharmacyBill, LabTest, LabPrescription, LabReport,
    Bill, Payment, Staff, User
)

client = APIClient()

print("=" * 70)
print("PHASE 4: END-TO-END CLINICAL FLOW VERIFICATION (LIVE DATA ONLY)")
print("=" * 70)

# -----------------------------------------------------------------------------
# STEP 1: Receptionist registers patient, books appointment, issues token
# -----------------------------------------------------------------------------
print("\n[STEP 1] RECEPTIONIST WORKFLOW")

# 1.1 Login as Receptionist
res = client.post('/api/auth/login/', {'username': 'receptionist1', 'password': 'receptionist123'}, format='json')
assert res.status_code == 200, f"Login failed: {res.data}"
rec_token = res.data['access']
client.credentials(HTTP_AUTHORIZATION='Bearer ' + rec_token)
rec_user = User.objects.get(Username='receptionist1')
rec_staff = Staff.objects.filter(UserId=rec_user).first()
assert rec_staff is not None, "Receptionist staff profile must exist"
print(f" -> Logged in as receptionist1 (Staff #{rec_staff.StaffId}: {rec_staff.Name}).")

# 1.2 Receptionist registers patient
pat_res = client.post('/api/receptionist/patients/', {
    'Name': 'Alice Wonderland',
    'Gender': 'Female',
    'DOB': '1998-05-15',
    'PhoneNumber': '9876543210',
    'Address': '42 Rabbit Hole Lane',
    'BloodGroup': 'B+',
    'Weight': 58.0,
    'Height': 165.0,
}, format='json')
assert pat_res.status_code == 201, f"Patient create failed: {pat_res.status_code} {pat_res.data}"
patient_id = pat_res.data['id']
print(f" [PASS] 1.1 Patient registered: id={patient_id} ('Alice Wonderland').")

# 1.3 Receptionist books appointment (NO ReceptionistId in payload - must come from logged-in user)
doc = Doctor.objects.filter(UserId__Username='doctor1').first()
assert doc is not None, "Doctor1 record must exist"
appt_res = client.post('/api/receptionist/appointments/', {
    'PatientId': patient_id,
    'DoctorId': doc.DoctorId,
    'DepartmentId': doc.DepartmentId_id,
    'AppointmentDateTime': '2026-10-25 10:30:00',
    'AppointmentStatus': 'Scheduled'
}, format='json')
assert appt_res.status_code == 201, f"Appointment create failed: {appt_res.status_code} {appt_res.data}"
appt_id = appt_res.data['id']

# Verify receptionist comes from logged-in user
appt_obj = Appointment.objects.get(pk=appt_id)
assert appt_obj.ReceptionistId_id == rec_staff.StaffId, (
    f"Expected receptionist staff {rec_staff.StaffId}, got {appt_obj.ReceptionistId_id}"
)
assert appt_obj.AppointmentStatus == 'Scheduled', f"Expected Scheduled, got {appt_obj.AppointmentStatus}"
print(f" [PASS] 1.2 Booked Appointment #{appt_id} (Receptionist staff #{rec_staff.StaffId} auto-assigned).")

# 1.4 Receptionist issues token (Patient and Doctor come from appointment, NOT provided in payload)
tok_res = client.post('/api/receptionist/tokens/', {
    'AppointmentId': appt_id
}, format='json')
assert tok_res.status_code == 201, f"Token issue failed: {tok_res.status_code} {tok_res.data}"
token_no = tok_res.data['id']

# Verify Patient and Doctor came from appointment
tok_obj = Token.objects.get(pk=token_no)
assert tok_obj.PatientId_id == patient_id, f"Expected patient {patient_id}, got {tok_obj.PatientId_id}"
assert tok_obj.DoctorId_id == doc.DoctorId, f"Expected doctor {doc.DoctorId}, got {tok_obj.DoctorId_id}"

# Verify appointment became 'Waiting'
appt_obj.refresh_from_db()
assert appt_obj.AppointmentStatus == 'Waiting', (
    f"Expected appointment status 'Waiting', got '{appt_obj.AppointmentStatus}'"
)
print(f" [PASS] 1.3 Issued Token #{token_no}: Patient #{patient_id} & Dr. {doc.Name} derived from appointment. Appointment status is now '{appt_obj.AppointmentStatus}'.")


# -----------------------------------------------------------------------------
# STEP 2: Doctor sees only their waiting queue, starts consultation -> Completed
# -----------------------------------------------------------------------------
print("\n[STEP 2] DOCTOR CONSULTATION WORKFLOW")

# 2.1 Login as Doctor
res = client.post('/api/auth/login/', {'username': 'doctor1', 'password': 'doctor123'}, format='json')
assert res.status_code == 200, f"Doctor login failed: {res.data}"
doc_token = res.data['access']
client.credentials(HTTP_AUTHORIZATION='Bearer ' + doc_token)
print(f" -> Logged in as doctor1 (Dr. {doc.Name}).")

# 2.2 Verify doctor sees only their own waiting queue
queue_res = client.get('/api/doctor/queue/')
assert queue_res.status_code == 200, f"Doctor queue failed: {queue_res.status_code} {queue_res.data}"
queue_items = queue_res.data.get('results', queue_res.data) if isinstance(queue_res.data, dict) else queue_res.data
assert any((item.get('AppointmentId') == appt_id or item.get('id') == appt_id) for item in queue_items), (
    f"Appointment #{appt_id} not found in Doctor {doc.Name}'s waiting queue ({queue_items})"
)
# Ensure all queue appointments belong to this doctor and are Waiting
for item in queue_items:
    d_id = item.get('DoctorId') or item.get('doctor')
    status = item.get('AppointmentStatus') or item.get('status')
    assert d_id == doc.DoctorId or str(d_id) == str(doc.DoctorId), f"Queue has appointment for different doctor: {d_id}"
    assert status == 'Waiting', f"Queue has non-waiting appointment status: {status}"
print(f" [PASS] 2.1 Doctor verified waiting queue: {len(queue_items)} waiting appointment(s), all scoped to Dr. {doc.Name}.")

# 2.3 Doctor records and completes consultation
cons_res = client.post('/api/consultations/', {
    'appointment': appt_id,
    'diagnosis': 'Acute Pharyngitis with Mild Pyrexia',
    'symptoms': 'Sore throat, fever for 3 days, difficulty swallowing',
    'notes': 'Rest, warm salt water gargle, prescribe antibiotics and analgesics.',
    'status': 'Completed'
}, format='json')
assert cons_res.status_code == 201, f"Consultation create failed: {cons_res.status_code} {cons_res.data}"
cons_id = cons_res.data['id']

# Verify consultation status is Completed and appointment status marked Completed
cons_obj = Consultation.objects.get(pk=cons_id)
assert cons_obj.ConsultationStatus == 'Completed', f"Expected Completed, got {cons_obj.ConsultationStatus}"
appt_obj.refresh_from_db()
assert appt_obj.AppointmentStatus == 'Completed', (
    f"Appointment should be marked 'Completed', found '{appt_obj.AppointmentStatus}'"
)
print(f" [PASS] 2.2 Doctor completed Consultation #{cons_id}. Appointment #{appt_id} status transitioned to '{appt_obj.AppointmentStatus}'.")


# -----------------------------------------------------------------------------
# STEP 3: Doctor writes prescription -> appears in Pharmacist queue
# -----------------------------------------------------------------------------
print("\n[STEP 3] PRESCRIPTION GENERATION & PHARMACIST QUEUE")

# 3.1 Doctor writes prescription with medicine line items
med = MasterMedicine.objects.first()
assert med is not None, "MasterMedicine must exist"
stock, _ = PharmacyStock.objects.get_or_create(
    Medicine=med,
    defaults={'QuantityOnHand': 100, 'UnitPrice': '5.00', 'SellingPrice': '12.00', 'ReorderLevel': 10}
)
if stock.QuantityOnHand < 10:
    stock.QuantityOnHand = 100
    stock.save()

dosage = Dosage.objects.first()
presc_res = client.post('/api/prescriptions/', {
    'consultation': cons_id,
    'patient': patient_id,
    'items': [
        {
            'MedicineId': med.MedicineId,
            'DosageId': dosage.DosageId,
            'Duration': '5 days',
            'Frequency': '1-0-1'
        }
    ]
}, format='json')
assert presc_res.status_code == 201, f"Prescription create failed: {presc_res.status_code} {presc_res.data}"
presc_id = presc_res.data['id']
presc_obj = Prescription.objects.get(pk=presc_id)
assert presc_obj.Status == 'Not Dispensed', f"Expected 'Not Dispensed', got {presc_obj.Status}"
print(f" [PASS] 3.1 Doctor created Prescription #{presc_id} with medicine '{med.MedicineName}' (Status: '{presc_obj.Status}').")

# 3.2 Login as Pharmacist and verify prescription in pharmacist queue
res = client.post('/api/auth/login/', {'username': 'pharmacist1', 'password': 'pharmacist123'}, format='json')
assert res.status_code == 200, f"Pharmacist login failed: {res.data}"
pharm_token = res.data['access']
client.credentials(HTTP_AUTHORIZATION='Bearer ' + pharm_token)

pharm_queue_res = client.get('/api/pharmacist/prescriptions/')
assert pharm_queue_res.status_code == 200, f"Pharmacist queue failed: {pharm_queue_res.status_code}"
pharm_queue = pharm_queue_res.data.get('results', pharm_queue_res.data) if isinstance(pharm_queue_res.data, dict) else pharm_queue_res.data
assert any((p.get('PrescriptionId') == presc_id or p.get('id') == presc_id) for p in pharm_queue), (
    f"Prescription #{presc_id} not found in Pharmacist queue"
)
print(f" [PASS] 3.2 Pharmacist verified incoming queue: Prescription #{presc_id} is present.")


# -----------------------------------------------------------------------------
# STEP 4: Dispensing creates bill, updates stock, updates prescription status
# -----------------------------------------------------------------------------
print("\n[STEP 4] DISPENSING & STOCK UPDATE")

# 4.1 Check stock before dispensing
stock.refresh_from_db()
initial_stock = stock.QuantityOnHand
dispense_qty = 2

# Get Prescription item detail
presc_detail = client.get(f'/api/pharmacist/prescriptions/{presc_id}/')
assert presc_detail.status_code == 200
items = presc_detail.data.get('items', [])
assert len(items) > 0, "Prescription items must be present"
item_id = items[0]['PrescriptionItemId']

# 4.2 Dispense prescription
disp_res = client.post(f'/api/pharmacist/prescriptions/{presc_id}/dispense/', {
    'items': [
        {
            'PrescriptionItemId': item_id,
            'Quantity': dispense_qty
        }
    ]
}, format='json')
assert disp_res.status_code == 201, f"Dispense failed: {disp_res.status_code} {disp_res.data}"
pharmacy_bill_id = disp_res.data.get('BillId') or disp_res.data.get('id')

# 4.3 Verify stock decreased
stock.refresh_from_db()
assert stock.QuantityOnHand == initial_stock - dispense_qty, (
    f"StockOnHand expected {initial_stock - dispense_qty}, got {stock.QuantityOnHand}"
)

# 4.4 Verify prescription status is now 'Dispensed'
presc_obj.refresh_from_db()
assert presc_obj.Status == 'Dispensed', f"Expected 'Dispensed', got '{presc_obj.Status}'"

# 4.5 Verify Pharmacy Bill and general patient Bill were generated
pharm_bill = PharmacyBill.objects.get(pk=pharmacy_bill_id)
assert pharm_bill.Patient_id == patient_id
gen_bill = Bill.objects.filter(PatientId=patient_id, BillType='Pharmacy').order_by('-BillId').first()
assert gen_bill is not None, "General Pharmacy bill must be created for patient"
print(f" [PASS] 4.1 Dispensed: Stock decreased ({initial_stock} -> {stock.QuantityOnHand}).")
print(f" [PASS] 4.2 Prescription #{presc_id} status updated to '{presc_obj.Status}'.")
print(f" [PASS] 4.3 Created PharmacyBill #{pharmacy_bill_id} and General Bill #{gen_bill.BillId} (Amount: {gen_bill.Amount}).")


# -----------------------------------------------------------------------------
# STEP 5: Lab test ordered -> Lab processes & saves report -> Doctor sees report -> Lab bill in Receptionist Payments
# -----------------------------------------------------------------------------
print("\n[STEP 5] LAB WORKFLOW, REPORT REVIEW & BILLING/PAYMENT")

# 5.1 Doctor orders a lab test
client.credentials(HTTP_AUTHORIZATION='Bearer ' + doc_token)
lab_test = LabTest.objects.filter(isActive=True).first()
assert lab_test is not None, "Active LabTest must exist"

lab_order_res = client.post('/api/lab-prescriptions/', {
    'LabTestId': lab_test.LabtestId,
    'PatientId': patient_id,
    'DoctorId': doc.DoctorId,
    'ConsultationId': cons_id,
    'SampleType': 'Blood',
    'Status': 'Sample collected'
}, format='json')
assert lab_order_res.status_code == 201, f"Lab order failed: {lab_order_res.status_code} {lab_order_res.data}"
lab_order_id = lab_order_res.data.get('LabPrescriptionId') or lab_order_res.data.get('id')
print(f" [PASS] 5.1 Doctor ordered Lab Test '{lab_test.TestName}' (Cost: {lab_test.TestCost}). Lab Order #{lab_order_id}.")

# 5.2 Lab Technician logs in and sees order in lab queue
res = client.post('/api/auth/login/', {'username': 'lab1', 'password': 'lab123'}, format='json')
assert res.status_code == 200, f"Lab login failed: {res.data}"
lab_token = res.data['access']
client.credentials(HTTP_AUTHORIZATION='Bearer ' + lab_token)

lab_queue_res = client.get('/api/lab-prescriptions/')
assert lab_queue_res.status_code == 200
lab_queue = lab_queue_res.data.get('results', lab_queue_res.data) if isinstance(lab_queue_res.data, dict) else lab_queue_res.data
assert any((o.get('LabPrescriptionId') == lab_order_id or o.get('id') == lab_order_id) for o in lab_queue), (
    f"Lab Order #{lab_order_id} not found in lab queue"
)
print(f" [PASS] 5.2 Lab Technician verified queue: Lab Order #{lab_order_id} is present.")

# 5.3 Lab Technician updates order to 'In Progress'
patch_res = client.patch(f'/api/lab-prescriptions/{lab_order_id}/', {'Status': 'In Progress'}, format='json')
assert patch_res.status_code == 200
print(f" [PASS] 5.3 Lab Technician started test (Status: 'In Progress').")

# 5.4 Lab Technician saves report
lab_staff = Staff.objects.filter(UserId__Username='lab1').first()
actual_reading = 'Hemoglobin: 14.2 g/dL, WBC: 7,200 /mcL, Platelets: 250,000 /mcL'
remarks_text = 'All diagnostic CBC parameters are within normal reference range.'

rep_res = client.post('/api/lab/lab-reports/', {
    'LabPrescriptionId': lab_order_id,
    'LabTechnician': lab_staff.StaffId if lab_staff else None,
    'ActualReading': actual_reading,
    'remarks': remarks_text
}, format='json')
assert rep_res.status_code == 201, f"Report create failed: {rep_res.status_code} {rep_res.data}"
report_id = rep_res.data.get('ReportId') or rep_res.data.get('id')

# Verify lab order was marked Completed upon report saving
lab_order_obj = LabPrescription.objects.get(pk=lab_order_id)
assert lab_order_obj.Status == 'Completed', f"Expected 'Completed', got '{lab_order_obj.Status}'"
print(f" [PASS] 5.4 Lab Technician saved Report #{report_id}. Lab Order #{lab_order_id} marked Completed.")

# 5.5 Doctor can see the report
client.credentials(HTTP_AUTHORIZATION='Bearer ' + doc_token)
doc_rep_res = client.get(f'/api/doctor/lab-reports/?order_id={lab_order_id}')
assert doc_rep_res.status_code == 200, f"Doctor view reports failed: {doc_rep_res.status_code} {doc_rep_res.data}"
doc_reports = doc_rep_res.data.get('results', doc_rep_res.data) if isinstance(doc_rep_res.data, dict) else doc_rep_res.data
assert len(doc_reports) > 0, f"Doctor cannot find report for order #{lab_order_id}"
found_report = doc_reports[0]
assert found_report.get('ActualReading') == actual_reading
assert found_report.get('remarks') == remarks_text
print(f" [PASS] 5.5 Doctor fetched and verified Lab Report #{report_id} findings ('{actual_reading}').")

# 5.6 Lab Bill appears in Receptionist's Billing & Payments
client.credentials(HTTP_AUTHORIZATION='Bearer ' + rec_token)
bill_type_key = f"Lab #{lab_order_id}"
bills_res = client.get('/api/receptionist/bills/')
assert bills_res.status_code == 200
bills_list = bills_res.data.get('results', bills_res.data) if isinstance(bills_res.data, dict) else bills_res.data

matching_bill = None
for b in bills_list:
    if b.get('BillType') == bill_type_key or b.get('bill_type') == bill_type_key:
        matching_bill = b
        break

assert matching_bill is not None, f"Lab Bill '{bill_type_key}' not found in Receptionist bills: {bills_list}"
lab_bill_id = matching_bill.get('BillId') or matching_bill.get('id')
assert matching_bill.get('BillStatus') == 'Pending' or matching_bill.get('status') == 'Pending'
assert float(matching_bill.get('Amount') or matching_bill.get('amount')) == float(lab_test.TestCost)
print(f" [PASS] 5.6 Receptionist verified auto-generated Lab Bill #{lab_bill_id} ({bill_type_key}, Amount: {lab_test.TestCost}, Status: Pending).")

# 5.7 Receptionist records payment for the Lab Bill
pay_res = client.post('/api/receptionist/payments/', {
    'BillId': lab_bill_id,
    'Amount': float(lab_test.TestCost),
    'PaymentMethod': 'Cash',
    'PaymentStatus': 'Completed'
}, format='json')
assert pay_res.status_code == 201, f"Payment failed: {pay_res.status_code} {pay_res.data}"
payment_id = pay_res.data.get('PaymentId') or pay_res.data.get('id')

# Verify the bill status is now 'Paid'
bill_obj = Bill.objects.get(pk=lab_bill_id)
assert bill_obj.BillStatus == 'Paid', f"Expected BillStatus 'Paid', got '{bill_obj.BillStatus}'"
print(f" [PASS] 5.7 Receptionist recorded Payment #{payment_id}. Bill #{lab_bill_id} status updated to '{bill_obj.BillStatus}'.")

print("\n" + "=" * 70)
print(">>> ALL 5 CLINICAL FLOW STEPS VERIFIED 100% GREEN ON LIVE DATA! <<<")
print("=" * 70)

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "clinicmanagementsystem.settings")
django.setup()

from rest_framework.test import APIClient

client = APIClient()

print("==================================================")
print("VERIFYING ALL ADMIN & LAB LIVE ENDPOINTS")
print("==================================================")

# 1. Admin endpoints
res_admin = client.post('/api/auth/login/', {'username': 'admin1', 'password': 'admin123'}, format='json')
assert res_admin.status_code == 200, f"Admin login failed: {res_admin.data}"
client.credentials(HTTP_AUTHORIZATION='Bearer ' + res_admin.data['access'])
print("[PASS] Authenticated as Admin (admin1)")

admin_endpoints = [
    ("/api/admin/dashboard/", "Admin Dashboard KPIs & Panels"),
    ("/api/admin/users/", "Admin Users"),
    ("/api/admin/departments/", "Admin Departments"),
    ("/api/admin/staff/", "Admin Staff"),
    ("/api/admin/doctors/", "Admin Doctors"),
    ("/api/admin/lab-tests/", "Admin Lab Tests"),
    ("/api/admin/medicines/", "Admin Medicines (with Stock Quantity)"),
    ("/api/admin/dosages/", "Admin Dosages"),
    ("/api/admin/audit-logs/", "Admin Audit Logs"),
]

for url, name in admin_endpoints:
    r = client.get(url)
    assert r.status_code == 200, f"{name} failed at {url}: {r.status_code} {r.data}"
    count = len(r.data) if isinstance(r.data, list) else len(r.data.get('results', r.data))
    print(f"[PASS] {name} -> HTTP 200 OK ({count} items)")

# 2. Lab Technician endpoints
res_lab = client.post('/api/auth/login/', {'username': 'lab1', 'password': 'lab123'}, format='json')
assert res_lab.status_code == 200, f"Lab login failed: {res_lab.data}"
client.credentials(HTTP_AUTHORIZATION='Bearer ' + res_lab.data['access'])
print("\n[PASS] Authenticated as Lab Technician (lab1)")

lab_endpoints = [
    ("/api/lab/lab-prescriptions/", "Lab Prescriptions Queue"),
    ("/api/lab/lab-reports/", "Lab Reports Archive"),
    ("/api/lab/lab-tests/", "Lab Tests Lookup"),
    ("/api/receptionist/bills/", "Lab Billing History"),
]

for url, name in lab_endpoints:
    r = client.get(url)
    assert r.status_code == 200, f"{name} failed at {url}: {r.status_code} {r.data}"
    count = len(r.data) if isinstance(r.data, list) else len(r.data.get('results', r.data))
    print(f"[PASS] {name} -> HTTP 200 OK ({count} items)")

print("\n>>> ALL 13 ADMIN & LAB API ENDPOINTS LIVE DATA RESPONDED 100% OK! <<<")

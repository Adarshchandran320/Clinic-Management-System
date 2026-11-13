import os
import sys
from pathlib import Path

# Ensure clinicmanagementsystem is on sys.path
current_dir = Path(__file__).resolve().parent
candidates = [current_dir.parent, current_dir.parent / "clinicmanagementsystem", current_dir / "clinicmanagementsystem", current_dir]
for c in candidates:
    if (c / "manage.py").exists():
        sys.path.insert(0, str(c))
        break

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "clinicmanagementsystem.settings")

import django
django.setup()

from rest_framework.test import APIClient

client = APIClient()

roles_credentials = [
    ('admin1', 'admin123', 'Admin'),
    ('doctor1', 'doctor123', 'Doctor'),
    ('receptionist1', 'receptionist123', 'Receptionist'),
    ('pharmacist1', 'pharmacist123', 'Pharmacist'),
    ('lab1', 'lab123', 'Lab Technician'),
]

print("=== 1. TESTING UNIFIED AUTHENTICATION FOR ALL ROLES ===")
tokens = {}
for username, password, expected_role in roles_credentials:
    res = client.post('/api/auth/login/', {'username': username, 'password': password}, format='json')
    assert res.status_code == 200, f"Login failed for {username}: {res.status_code} {res.data}"
    data = res.data
    assert 'access' in data, f"No access token for {username}"
    assert 'refresh' in data, f"No refresh token for {username}"
    assert data['user']['role'] == expected_role, f"Wrong role for {username}: {data['user']['role']}"
    tokens[username] = data['access']
    print(f"[PASS] {expected_role:<15} ({username}) logged in. User id={data['user']['id']}, token length={len(data['access'])}")

# Test Token Refresh
print("\n=== 2. TESTING TOKEN REFRESH ===")
admin_res = client.post('/api/auth/login/', {'username': 'admin1', 'password': 'admin123'}, format='json')
refresh_token = admin_res.data['refresh']
ref_res = client.post('/api/auth/refresh/', {'refresh': refresh_token}, format='json')
assert ref_res.status_code == 200, f"Refresh failed: {ref_res.status_code} {ref_res.data}"
assert 'access' in ref_res.data, "Refresh returned no access token"
print("[PASS] Token refreshed successfully.")

# Test Admin login endpoint specifically
print("\n=== 3. TESTING /api/admin/login/ ===")
admin_ep_res = client.post('/api/admin/login/', {'Username': 'admin1', 'Password': 'admin123'}, format='json')
assert admin_ep_res.status_code == 200, f"Admin login endpoint failed: {admin_ep_res.status_code}"
assert 'access' in admin_ep_res.data
assert 'refresh' in admin_ep_res.data
print("[PASS] /api/admin/login/ works and returns access + refresh tokens.")

# Test protected endpoints for each role
print("\n=== 4. TESTING PROTECTED ENDPOINTS FOR ALL ROLES ===")

# Doctor
client.credentials(HTTP_AUTHORIZATION='Bearer ' + tokens['doctor1'])
doc_res = client.get('/api/consultations/')
assert doc_res.status_code == 200, f"Doctor consultations failed: {doc_res.status_code} {doc_res.data}"
print(f"[PASS] Doctor authenticated request to /api/consultations/ succeeded (count={len(doc_res.data)}).")

# Receptionist
client.credentials(HTTP_AUTHORIZATION='Bearer ' + tokens['receptionist1'])
rec_res = client.get('/api/receptionist/appointments/')
assert rec_res.status_code == 200, f"Receptionist appointments failed: {rec_res.status_code} {rec_res.data}"
print(f"[PASS] Receptionist authenticated request to /api/receptionist/appointments/ succeeded (count={len(rec_res.data)}).")

# Pharmacist
client.credentials(HTTP_AUTHORIZATION='Bearer ' + tokens['pharmacist1'])
pharm_res = client.get('/api/pharmacist/prescriptions/')
assert pharm_res.status_code == 200, f"Pharmacist prescriptions failed: {pharm_res.status_code} {pharm_res.data}"
print(f"[PASS] Pharmacist authenticated request to /api/pharmacist/prescriptions/ succeeded (count={len(pharm_res.data)}).")

# Lab Technician
client.credentials(HTTP_AUTHORIZATION='Bearer ' + tokens['lab1'])
lab_res = client.get('/api/lab-prescriptions/')
assert lab_res.status_code == 200, f"Lab prescriptions failed: {lab_res.status_code} {lab_res.data}"
print(f"[PASS] Lab Technician authenticated request to /api/lab-prescriptions/ succeeded (count={len(lab_res.data)}).")

# Admin
client.credentials(HTTP_AUTHORIZATION='Bearer ' + tokens['admin1'])
admin_res = client.get('/api/admin/users/')
assert admin_res.status_code == 200, f"Admin users failed: {admin_res.status_code} {admin_res.data}"
print(f"[PASS] Admin authenticated request to /api/admin/users/ succeeded (count={len(admin_res.data)}).")

# Current user endpoint
me_res = client.get('/api/auth/me/')
assert me_res.status_code == 200
print(f"[PASS] /api/auth/me/ returned user details: {me_res.data['username']} ({me_res.data['role']})")

# Test Invalid Credentials
print("\n=== 5. TESTING INVALID CREDENTIALS ===")
bad_res = client.post('/api/auth/login/', {'username': 'admin1', 'password': 'wrongpassword'}, format='json')
assert bad_res.status_code == 401, f"Expected 401 for wrong password, got {bad_res.status_code}"
print("[PASS] Invalid password correctly rejected with 401 Unauthorized.")

print("\n>>> ALL BACKEND AUTH & ENDPOINT TESTS PASSED 100%! <<<")

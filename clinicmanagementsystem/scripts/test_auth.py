import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "clinicmanagementsystem.settings")
django.setup()

from apibackendapp.models import User
from django.contrib.auth.hashers import check_password

u = User.objects.filter(Username='admin1').first()
print("admin1 check password 'admin123':", u.check_password('admin123') if u else None)
print("admin1 check password 'admin':", u.check_password('admin') if u else None)

u2 = User.objects.filter(Username='admin').first()
print("admin check password 'admin123':", u2.check_password('admin123') if u2 else None)
print("admin check password 'admin':", u2.check_password('admin') if u2 else None)

u3 = User.objects.filter(Username='lab1').first()
print("lab1 check password 'lab123':", u3.check_password('lab123') if u3 else None)

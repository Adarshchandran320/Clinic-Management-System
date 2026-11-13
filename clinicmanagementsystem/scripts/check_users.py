import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "clinicmanagementsystem.settings")
django.setup()

from apibackendapp.models import User

for u in User.objects.all():
    print(f"User: {u.Username}, Role: {u.RoleId.RoleName if u.RoleId else None}, Active: {u.isActive}")

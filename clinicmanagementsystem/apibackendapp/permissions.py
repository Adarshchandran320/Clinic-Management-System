from rest_framework.permissions import BasePermission, SAFE_METHODS


def is_authenticated_user(user):
    """Checks whether the user object represents an active, authenticated user."""
    if not user:
        return False
    if getattr(user, "is_authenticated", False) is True:
        return True
    return bool(getattr(user, "isActive", False))


def get_user_role(user):
    """Safely extracts role name string in lowercase from user object."""
    if not user:
        return None
    # Support test user with staff_profile or real apibackendapp.User
    if not getattr(user, "isActive", False):
        staff = getattr(user, "staff_profile", None)
        if staff and getattr(staff, "UserId", None):
            user = staff.UserId

    role_obj = getattr(user, "RoleId", None)
    if not role_obj:
        staff = getattr(user, "staff_profile", None)
        if staff:
            role_obj = getattr(staff, "RoleId", None) or getattr(getattr(staff, "UserId", None), "RoleId", None)

    if not role_obj:
        return None
    return str(role_obj.RoleName).strip().lower()


class IsCustomAuthenticated(BasePermission):
    """Allows access only to active authenticated users."""

    def has_permission(self, request, view):
        return is_authenticated_user(getattr(request, "user", None))


class IsAdminUser(BasePermission):
    """Allows access only to Admin users."""

    def has_permission(self, request, view):
        if not is_authenticated_user(getattr(request, "user", None)):
            return False
        role = get_user_role(request.user)
        return role == "admin"


class IsAdminUserOrReadOnly(BasePermission):
    """Allows read access to any logged-in user; write access to Admin only."""

    def has_permission(self, request, view):
        if not is_authenticated_user(getattr(request, "user", None)):
            return False
        if request.method in SAFE_METHODS:
            return True
        role = get_user_role(request.user)
        return role == "admin"


class IsDoctorUser(BasePermission):
    """
    Reads need any logged-in user.
    Writes need Doctor or Admin (e.g. consultations, prescriptions).
    """

    def has_permission(self, request, view):
        if not is_authenticated_user(getattr(request, "user", None)):
            return False
        if request.method in SAFE_METHODS:
            return True
        role = get_user_role(request.user)
        return role in ["doctor", "admin"]


class IsReceptionistUser(BasePermission):
    """
    Reads need any logged-in user.
    Writes need Receptionist or Admin (e.g. patients, appointments, tokens, payments).
    """

    def has_permission(self, request, view):
        if not is_authenticated_user(getattr(request, "user", None)):
            return False
        if request.method in SAFE_METHODS:
            return True
        role = get_user_role(request.user)
        return role in ["receptionist", "admin"]


class IsPharmacistUser(BasePermission):
    """
    Reads and writes restricted to Pharmacist and Admin only (e.g. pharmacy stock, revenue, reorder reports).
    """

    def has_permission(self, request, view):
        if not is_authenticated_user(getattr(request, "user", None)):
            return False
        role = get_user_role(request.user)
        return role in ["pharmacist", "admin"]


class IsLabTechnicianUser(BasePermission):
    """
    Reads need any logged-in user.
    Writes need Lab Technician or Admin (e.g. reports).
    """

    def has_permission(self, request, view):
        if not is_authenticated_user(getattr(request, "user", None)):
            return False
        if request.method in SAFE_METHODS:
            return True
        role = get_user_role(request.user)
        return role in ["lab", "lab technician", "labtechnician", "admin"]


class IsLabPrescriptionPermission(BasePermission):
    """
    Reads need any logged-in user.
    Doctor or Admin can create lab orders (POST).
    Lab Technician, Doctor, or Admin can update lab orders (PUT, PATCH).
    Admin can delete (DELETE).
    """

    def has_permission(self, request, view):
        if not is_authenticated_user(getattr(request, "user", None)):
            return False
        if request.method in SAFE_METHODS:
            return True
        role = get_user_role(request.user)
        if request.method == "POST":
            return role in ["doctor", "admin"]
        if request.method in ["PUT", "PATCH"]:
            return role in ["lab", "lab technician", "labtechnician", "doctor", "admin"]
        if request.method == "DELETE":
            return role == "admin"
        return False


class IsBillPermission(BasePermission):
    """
    Reads restricted to Receptionist, Pharmacist, Lab Technician, and Admin only.
    Receptionist or Admin has full write access.
    Lab Technician may create bills only when BillType starts with 'Lab'.
    Pharmacist may create bills.
    """

    def has_permission(self, request, view):
        if not is_authenticated_user(getattr(request, "user", None)):
            return False
        role = get_user_role(request.user)
        if request.method in SAFE_METHODS:
            return role in ["receptionist", "pharmacist", "lab", "lab technician", "labtechnician", "admin"]
        if role in ["receptionist", "admin"]:
            return True
        if role in ["lab", "lab technician", "labtechnician"]:
            if request.method == "POST":
                bill_type = str(
                    request.data.get("BillType")
                    or request.data.get("bill_type")
                    or request.data.get("billType")
                    or ""
                ).strip()
                if bill_type.lower().startswith("lab"):
                    return True
        if role == "pharmacist":
            if request.method == "POST":
                return True
        return False



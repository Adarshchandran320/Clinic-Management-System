from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from apibackendapp.models import User, AuditLog


class UnifiedLoginView(APIView):
    """
    Unified login endpoint for all roles:
    Admin, Doctor, Receptionist, Pharmacist, Lab Technician.
    Accepts both lowercase and uppercase keys:
    { "username": "...", "password": "..." } or { "Username": "...", "Password": "..." }
    Returns JWT access & refresh tokens along with user information and role.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username") or request.data.get("Username")
        password = request.data.get("password") or request.data.get("Password")

        if not username or not password:
            return Response(
                {"error": "Both username and password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        username = str(username).strip()
        user = User.objects.select_related('RoleId').filter(Username=username).first()

        if not user:
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.check_password(password):
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.isActive:
            return Response(
                {"error": "User account is inactive. Please contact administration."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Record login in AuditLog
        try:
            AuditLog.objects.create(
                UserId=user,
                ActionType="LOGIN",
                TableAffected="User",
                RecordId=user.UserId,
                Details=f"{user.RoleId.RoleName} '{user.Username}' logged in successfully."
            )
        except Exception:
            pass  # Do not block login if audit logging encounters an issue

        # Generate JWT tokens with custom payload claims
        refresh = RefreshToken()
        refresh['user_id'] = user.UserId
        refresh['username'] = user.Username
        refresh['role'] = user.RoleId.RoleName

        access = refresh.access_token
        access['user_id'] = user.UserId
        access['username'] = user.Username
        access['role'] = user.RoleId.RoleName

        return Response(
            {
                "access": str(access),
                "refresh": str(refresh),
                "user": {
                    "id": user.UserId,
                    "user_id": user.UserId,
                    "username": user.Username,
                    "role": user.RoleId.RoleName,
                    "role_id": user.RoleId.RoleId,
                },
                "message": f"Welcome, {user.Username}! Login successful."
            },
            status=status.HTTP_200_OK
        )


class CurrentUserView(APIView):
    """
    Returns the currently authenticated user's profile and role.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            "id": user.UserId,
            "user_id": user.UserId,
            "username": user.Username,
            "role": user.RoleId.RoleName if user.RoleId else None,
            "role_id": user.RoleId.RoleId if user.RoleId else None,
            "isActive": user.isActive,
        }

        # Check for linked Doctor profile
        doctor_profile = getattr(user, 'doctor_profile', None)
        if doctor_profile:
            data['doctor'] = {
                "id": doctor_profile.DoctorId,
                "name": doctor_profile.Name,
                "specialization": doctor_profile.Specialization,
                "qualification": doctor_profile.Qualification,
                "department": doctor_profile.DepartmentId.DepartmentName if doctor_profile.DepartmentId else None,
            }

        # Check for linked Staff profile
        staff_profile = getattr(user, 'staff_profile', None)
        if staff_profile:
            data['staff'] = {
                "id": staff_profile.StaffId,
                "name": staff_profile.Name,
                "phone": staff_profile.phoneNumber,
                "address": staff_profile.Address,
            }

        return Response(data, status=status.HTTP_200_OK)


class CustomTokenRefreshView(APIView):
    """
    Custom refresh view that validates the RefreshToken,
    loads the custom apibackendapp.User by user_id from token payload,
    verifies isActive, and returns a new access token.
    Avoids 500 errors from SimpleJWT's stock view which attempts to query Django's auth.User.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_str = request.data.get("refresh")
        if not refresh_str:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            refresh = RefreshToken(refresh_str)
            user_id = refresh.get("user_id")
            if not user_id:
                return Response(
                    {"error": "Token payload missing user_id."},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            user = User.objects.select_related("RoleId").filter(UserId=user_id).first()
            if not user:
                return Response(
                    {"error": "User does not exist."},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if not user.isActive:
                return Response(
                    {"error": "User account is inactive. Please contact administration."},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            access = refresh.access_token
            access["user_id"] = user.UserId
            access["username"] = user.Username
            access["role"] = user.RoleId.RoleName if user.RoleId else None

            return Response(
                {
                    "access": str(access),
                },
                status=status.HTTP_200_OK
            )
        except (TokenError, InvalidToken) as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            return Response(
                {"error": f"Token refresh failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


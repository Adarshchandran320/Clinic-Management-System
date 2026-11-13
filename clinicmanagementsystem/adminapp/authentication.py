from rest_framework.authentication import BaseAuthentication
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken

from apibackendapp.models import User


class AdminJWTAuthentication(BaseAuthentication):

    def authenticate(self, request):

        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        try:
            parts = auth_header.split()

            if len(parts) != 2 or parts[0].lower() != "bearer":
                raise AuthenticationFailed("Invalid authorization header.")

            token = parts[1]

            access_token = AccessToken(token)

            user_id = access_token.get('user_id')

            user = User.objects.select_related('RoleId').get(UserId=user_id)

            if not user.isActive:
                raise AuthenticationFailed("User is inactive.")

            if str(user.RoleId.RoleName).strip().lower() != "admin":
                raise AuthenticationFailed("Admin access required.")

            return (user, token)

        except User.DoesNotExist:
            raise AuthenticationFailed("User not found.")

        except AuthenticationFailed:
            raise

        except Exception:
            raise AuthenticationFailed("Invalid or expired token.")


class IsAdminUser(BasePermission):

    def has_permission(self, request, view):

        if not request.user:
            return False

        if not getattr(request.user, "isActive", False):
            return False

        if not getattr(request.user, "RoleId", None):
            return False

        if str(request.user.RoleId.RoleName).strip().lower() != "admin":
            return False

        return True
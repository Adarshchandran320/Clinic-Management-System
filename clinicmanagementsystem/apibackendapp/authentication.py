from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from apibackendapp.models import User


class UnifiedJWTAuthentication(BaseAuthentication):
    """
    Unified JWT Authentication class that authenticates all roles
    (Admin, Doctor, Receptionist, Pharmacist, Lab Technician)
    using the project's custom User model (apibackendapp.models.User).
    """

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise AuthenticationFailed("Invalid authorization header format. Expected 'Bearer <token>'.")

        token_str = parts[1]

        try:
            token = AccessToken(token_str)
            user_id = token.get('user_id')

            if not user_id:
                raise AuthenticationFailed("Token is missing user_id claim.")

            user = User.objects.select_related('RoleId').get(UserId=user_id)

            if not user.isActive:
                raise AuthenticationFailed("User account is inactive.")

            return (user, token)

        except User.DoesNotExist:
            raise AuthenticationFailed("User does not exist.")
        except AuthenticationFailed:
            raise
        except Exception as e:
            raise AuthenticationFailed(f"Invalid or expired token: {str(e)}")

    def authenticate_header(self, request):
        return 'Bearer realm="api"'

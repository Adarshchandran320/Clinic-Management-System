from django.urls import path
from apibackendapp.auth_views import UnifiedLoginView, CurrentUserView, CustomTokenRefreshView

urlpatterns = [
    path('login/', UnifiedLoginView.as_view(), name='auth-login'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='token-refresh'),
    path('me/', CurrentUserView.as_view(), name='auth-me'),
]

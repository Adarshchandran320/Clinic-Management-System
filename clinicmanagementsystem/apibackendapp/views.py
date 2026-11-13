from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from apibackendapp.models import Notification
from apibackendapp.serializers import NotificationSerializer
from apibackendapp.permissions import IsCustomAuthenticated, is_authenticated_user


class NotificationPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = "page_size"
    max_page_size = 100


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Notification ViewSet:
    - User only ever sees their own notifications.
    - Endpoints:
      - GET /api/notifications/ (newest first, paginated)
      - GET /api/notifications/unread-count/
      - POST /api/notifications/<id>/read/
      - POST /api/notifications/read-all/
    - Access control:
      - Requires authentication (401 if unauthenticated)
      - A user cannot read or mark another user's notification (403 or 404)
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsCustomAuthenticated]
    pagination_class = NotificationPagination
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = getattr(self.request, "user", None)
        if not is_authenticated_user(user):
            return Notification.objects.none()
        return Notification.objects.filter(recipient=user).order_by("-created_at")

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        notif = Notification.objects.filter(pk=pk).first()
        if not notif:
            return Response(
                {"detail": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if notif.recipient_id != request.user.UserId:
            return Response(
                {"detail": "You do not have permission to view this notification."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(notif)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        user = request.user
        count = Notification.objects.filter(recipient=user, is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notif = Notification.objects.filter(pk=pk).first()
        if not notif:
            return Response(
                {"detail": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if notif.recipient_id != request.user.UserId:
            return Response(
                {"detail": "You do not have permission to modify this notification."},
                status=status.HTTP_403_FORBIDDEN,
            )
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        serializer = self.get_serializer(notif)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_read_all(self, request):
        user = request.user
        updated = Notification.objects.filter(recipient=user, is_read=False).update(is_read=True)
        return Response(
            {"detail": "All notifications marked as read.", "count": updated},
            status=status.HTTP_200_OK,
        )

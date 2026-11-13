from rest_framework import serializers
from apibackendapp.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="NotificationId", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "NotificationId",
            "recipient",
            "title",
            "message",
            "type",
            "related_model",
            "related_id",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["NotificationId", "id", "recipient", "created_at"]

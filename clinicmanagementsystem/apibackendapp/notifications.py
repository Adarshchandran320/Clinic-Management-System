import logging
from django.db import transaction, connection
from apibackendapp.models import Notification, User

logger = logging.getLogger(__name__)


def notify(recipients, title, message, type, related_model=None, related_id=None, actor=None):
    """
    Core notification dispatcher.
    - recipients: a User, Staff, Doctor, integer UserId, or iterable/queryset of them.
    - title: short headline.
    - message: body text.
    - type: category (e.g. 'appointment', 'token', 'prescription', 'inventory', 'lab_order', 'lab_report', 'user').
    - related_model: model name (e.g. 'Appointment', 'Prescription', etc.).
    - related_id: primary key of related model.
    - actor: user instance or id who triggered the action. Never notified.

    Uses transaction.on_commit so a notification only exists for a saved record.
    A failure to notify is logged, never swallowed silently, and never breaks the caller.
    """
    def _create_notifications():
        try:
            # 1. Resolve actor id
            actor_id = None
            if actor is not None:
                if isinstance(actor, User):
                    actor_id = actor.UserId
                elif hasattr(actor, "UserId"):
                    u = getattr(actor, "UserId")
                    actor_id = u.UserId if isinstance(u, User) else u
                elif isinstance(actor, int):
                    actor_id = actor

            # 2. Flatten and resolve recipients to active User instances
            recip_list = recipients if isinstance(recipients, (list, set, tuple)) else [recipients]
            target_users = set()

            for item in recip_list:
                if item is None:
                    continue
                if hasattr(item, "__iter__") and not isinstance(item, (str, bytes)):
                    for sub in item:
                        _resolve_user(sub, target_users)
                else:
                    _resolve_user(item, target_users)

            # 3. Create Notification records
            created = []
            for user in target_users:
                if actor_id and user.UserId == actor_id:
                    # Never notify the user who did the action
                    continue
                if not user.isActive:
                    continue

                notif = Notification.objects.create(
                    recipient=user,
                    title=title,
                    message=message,
                    type=type,
                    related_model=related_model,
                    related_id=int(related_id) if related_id is not None else None,
                )
                created.append(notif)
            return created
        except Exception as exc:
            logger.error(
                "Failed to create notifications (type=%s, title=%s): %s",
                type,
                title,
                exc,
                exc_info=True,
            )
            # Never raise, never break caller

    try:
        if connection.in_atomic_block:
            transaction.on_commit(_create_notifications)
        else:
            _create_notifications()
    except Exception as exc:
        logger.error(
            "Failed to register on_commit callback for notification (type=%s): %s",
            type,
            exc,
            exc_info=True,
        )


def _resolve_user(obj, target_set):
    if obj is None:
        return
    if isinstance(obj, User):
        target_set.add(obj)
    elif hasattr(obj, "UserId") and isinstance(obj.UserId, User):
        target_set.add(obj.UserId)
    elif isinstance(obj, int):
        u = User.objects.filter(pk=obj, isActive=True).first()
        if u:
            target_set.add(u)


def notify_appointment_created(appointment, actor=None):
    """Event: token or appointment created -> the assigned doctor"""
    doc = appointment.DoctorId
    doctor_user = getattr(doc, "UserId", None) if doc else None
    if not doctor_user:
        return
    patient_name = appointment.PatientId.Name if appointment.PatientId else f"Patient #{appointment.PatientId_id}"
    notify(
        recipients=doctor_user,
        title="New Appointment Scheduled",
        message=f"Appointment #{appointment.AppointmentId} scheduled for {patient_name} on {appointment.AppointmentDateTime}.",
        type="appointment",
        related_model="Appointment",
        related_id=appointment.AppointmentId,
        actor=actor,
    )


def notify_token_created(token, actor=None):
    """Event: token created -> the assigned doctor"""
    doc = token.DoctorId
    doctor_user = getattr(doc, "UserId", None) if doc else None
    if not doctor_user:
        return
    patient_name = token.PatientId.Name if token.PatientId else f"Patient #{token.PatientId_id}"
    notify(
        recipients=doctor_user,
        title="Token Issued",
        message=f"Token #{token.TokenNo} issued for {patient_name} (Appointment #{token.AppointmentId_id}).",
        type="token",
        related_model="Token",
        related_id=token.TokenNo,
        actor=actor,
    )


def notify_appointment_cancelled(appointment, actor=None):
    """Event: appointment cancelled -> the assigned doctor"""
    doc = appointment.DoctorId
    doctor_user = getattr(doc, "UserId", None) if doc else None
    if not doctor_user:
        return
    patient_name = appointment.PatientId.Name if appointment.PatientId else f"Patient #{appointment.PatientId_id}"
    notify(
        recipients=doctor_user,
        title="Appointment Cancelled",
        message=f"Appointment #{appointment.AppointmentId} for {patient_name} has been cancelled.",
        type="appointment",
        related_model="Appointment",
        related_id=appointment.AppointmentId,
        actor=actor,
    )


def notify_prescription_created(prescription, actor=None):
    """Event: prescription created -> every active pharmacist"""
    pharmacists = User.objects.filter(RoleId__RoleName__iexact="Pharmacist", isActive=True)
    doctor_name = prescription.DoctorId.Name if prescription.DoctorId else "Doctor"
    patient_name = prescription.PatientId.Name if prescription.PatientId else f"Patient #{prescription.PatientId_id}"
    notify(
        recipients=pharmacists,
        title="New Prescription",
        message=f"Prescription #{prescription.PrescriptionId} created by Dr. {doctor_name} for {patient_name}.",
        type="prescription",
        related_model="Prescription",
        related_id=prescription.PrescriptionId,
        actor=actor,
    )


def notify_prescription_dispensed(prescription, actor=None):
    """Event: prescription dispensed -> the prescribing doctor"""
    doc = prescription.DoctorId
    doctor_user = getattr(doc, "UserId", None) if doc else None
    if not doctor_user:
        return
    patient_name = prescription.PatientId.Name if prescription.PatientId else f"Patient #{prescription.PatientId_id}"
    notify(
        recipients=doctor_user,
        title="Prescription Dispensed",
        message=f"Prescription #{prescription.PrescriptionId} for {patient_name} has been dispensed.",
        type="prescription",
        related_model="Prescription",
        related_id=prescription.PrescriptionId,
        actor=actor,
    )


def notify_low_stock(stock, actor=None):
    """Event: stock at or below reorder level after dispensing -> pharmacists and admins"""
    recipients = User.objects.filter(
        RoleId__RoleName__in=["Pharmacist", "Admin", "pharmacist", "admin"],
        isActive=True,
    )
    med_name = stock.Medicine.MedicineName if stock.Medicine else f"Medicine #{stock.Medicine_id}"
    notify(
        recipients=recipients,
        title="Low Stock Alert",
        message=f"Medicine '{med_name}' stock is low: {stock.QuantityOnHand} remaining (Reorder level: {stock.ReorderLevel}).",
        type="inventory",
        related_model="PharmacyStock",
        related_id=stock.StockId,
        actor=actor,
    )


def notify_lab_order_created(lab_order, actor=None):
    """Event: lab order created -> every active lab technician"""
    techs = User.objects.filter(
        RoleId__RoleName__in=["Lab", "Lab Technician", "lab", "lab technician", "labtechnician"],
        isActive=True,
    )
    test_name = lab_order.LabTestId.TestName if lab_order.LabTestId else "Lab Test"
    patient_name = lab_order.PatientId.Name if lab_order.PatientId else f"Patient #{lab_order.PatientId_id}"
    notify(
        recipients=techs,
        title="New Lab Order",
        message=f"Lab order #{lab_order.LabPrescriptionId} ({test_name}) requested for {patient_name}.",
        type="lab_order",
        related_model="LabPrescription",
        related_id=lab_order.LabPrescriptionId,
        actor=actor,
    )


def notify_lab_report_saved(lab_report, actor=None):
    """Event: lab report saved -> the ordering doctor, and receptionists for the new lab bill"""
    recipients = []
    order = lab_report.LabPrescriptionId
    if order and order.DoctorId and getattr(order.DoctorId, "UserId", None):
        recipients.append(order.DoctorId.UserId)

    receptionists = User.objects.filter(RoleId__RoleName__iexact="Receptionist", isActive=True)
    recipients.extend(list(receptionists))

    patient_name = order.PatientId.Name if order and order.PatientId else "Patient"
    order_id = order.LabPrescriptionId if order else lab_report.LabPrescriptionId_id
    notify(
        recipients=recipients,
        title="Lab Report Finalized",
        message=f"Diagnostic report for {patient_name} (Order #{order_id}) is ready. Lab bill created.",
        type="lab_report",
        related_model="LabReport",
        related_id=lab_report.ReportId,
        actor=actor,
    )


def notify_user_created(user, actor=None):
    """Event: user created -> admins"""
    admins = User.objects.filter(RoleId__RoleName__iexact="Admin", isActive=True)
    role_name = user.RoleId.RoleName if user.RoleId else "No Role"
    notify(
        recipients=admins,
        title="User Created",
        message=f"User account '{user.Username}' ({role_name}) was created.",
        type="user",
        related_model="User",
        related_id=user.UserId,
        actor=actor,
    )


def notify_user_deactivated(user, actor=None):
    """Event: user deactivated -> admins"""
    admins = User.objects.filter(RoleId__RoleName__iexact="Admin", isActive=True)
    notify(
        recipients=admins,
        title="User Deactivated",
        message=f"User account '{user.Username}' was deactivated.",
        type="user",
        related_model="User",
        related_id=user.UserId,
        actor=actor,
    )

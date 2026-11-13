from django.db import transaction
from django.utils import timezone

from apibackendapp.models import PharmacyStock, PharmacyBill, PharmacyBillItem, Bill


class DispenseError(Exception):
    """Raised for any business-rule failure during dispensing (bad item,
    insufficient stock, etc). Callers should turn this into a 400 response."""


@transaction.atomic
def dispense_prescription(prescription, items_data, dispensing_staff):
    """
    Core dispensing workflow (SRS requirement 5).

    - Validates each requested item actually belongs to this prescription.
    - Locks the matching stock row with select_for_update() so concurrent
      dispensing against the same medicine can't oversell stock.
    - Decrements stock and creates the PharmacyBill + PharmacyBillItem rows.
    - Updates Prescription.Status based on medicine coverage.

    Runs inside one transaction: any DispenseError raised here rolls back
    every stock decrement and bill row created earlier in this same call,
    so a failure partway through never leaves a half-dispensed record.
    """

    seen_item_ids = set()
    for entry in items_data:
        item_id = entry["PrescriptionItemId"].pk
        if item_id in seen_item_ids:
            raise DispenseError(
                f"PrescriptionItem {item_id} was submitted more than once in this request."
            )
        seen_item_ids.add(item_id)

    bill = PharmacyBill.objects.create(
        Patient=prescription.PatientId,
        Prescription=prescription,
        DispensedBy=dispensing_staff,
        TotalAmount=0,
    )

    updated_stocks = []
    total = 0
    for entry in items_data:
        prescription_item = entry["PrescriptionItemId"]
        quantity = entry["Quantity"]

        if prescription_item.PrescriptionId_id != prescription.pk:
            raise DispenseError(
                f"PrescriptionItem {prescription_item.pk} does not belong to "
                f"Prescription {prescription.pk}."
            )

        medicine = prescription_item.MedicineId
        stock = (
            PharmacyStock.objects.select_for_update()
            .filter(Medicine=medicine)
            .order_by("StockId")
            .first()
        )
        if stock is None:
            raise DispenseError(f"No stock record exists for '{medicine.MedicineName}'.")
        if stock.QuantityOnHand < quantity:
            raise DispenseError(
                f"Insufficient stock for '{medicine.MedicineName}': "
                f"requested {quantity}, only {stock.QuantityOnHand} available."
            )

        stock.QuantityOnHand -= quantity
        stock.save(update_fields=["QuantityOnHand", "LastUpdated"])
        updated_stocks.append(stock)

        # Billed at SellingPrice (what the patient is charged), not UnitPrice
        # (the pharmacy's cost basis) — see "Assumptions" in chat.
        line_amount = quantity * stock.SellingPrice
        PharmacyBillItem.objects.create(
            Bill=bill,
            Medicine=medicine,
            Quantity=quantity,
            UnitPrice=stock.SellingPrice,
            LineAmount=line_amount,
        )
        total += line_amount

    bill.TotalAmount = total
    bill.save(update_fields=["TotalAmount"])

    _update_prescription_status(prescription)

    # Auto-generate a general Bill for the patient after dispensing
    Bill.objects.create(
        PatientId=prescription.PatientId,
        BillDate=timezone.now().date(),
        Amount=total,
        BillStatus='Pending',
        BillType='Pharmacy',
    )

    actor_user = getattr(dispensing_staff, "UserId", None)

    # Notify prescribing doctor when prescription is dispensed
    if prescription.Status == "Dispensed":
        from apibackendapp.notifications import notify_prescription_dispensed
        notify_prescription_dispensed(prescription, actor=actor_user)

    # Notify pharmacists and admins if stock reached or dropped below reorder level
    from apibackendapp.notifications import notify_low_stock
    for s in updated_stocks:
        if s.QuantityOnHand <= s.ReorderLevel:
            notify_low_stock(s, actor=actor_user)

    return bill


def _update_prescription_status(prescription):
    """
    PharmacyBillItem has no direct FK to PrescriptionItem — the only link
    between a bill and a prescription is at the Bill level
    (PharmacyBill.Prescription). So "fully dispensed" is inferred by
    comparing the set of prescribed medicines against the set of medicines
    actually billed against this prescription across all its bills. This
    detects per-medicine coverage, not partial-quantity fulfillment of a
    single medicine — see "Assumptions" in chat for the shared-model gap
    this works around.
    """

    prescribed_medicine_ids = set(
        prescription.items.values_list("MedicineId_id", flat=True)
    )
    dispensed_medicine_ids = set(
        PharmacyBillItem.objects.filter(Bill__Prescription=prescription).values_list(
            "Medicine_id", flat=True
        )
    )

    if prescribed_medicine_ids and prescribed_medicine_ids.issubset(dispensed_medicine_ids):
        prescription.Status = "Dispensed"
    elif dispensed_medicine_ids:
        prescription.Status = "Partially Dispensed"
    else:
        prescription.Status = "Not Dispensed"

    prescription.save(update_fields=["Status"])
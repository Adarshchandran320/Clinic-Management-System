from rest_framework import serializers

from apibackendapp.models import (
    MasterMedicine,
    PharmacyStock,
    PharmacyBill,
    PharmacyBillItem,
    Prescription,
    PrescriptionItem,
)


class MasterMedicineSerializer(serializers.ModelSerializer):
    """
    Read-only for the pharmacist. Medicines are created/maintained by Admin
    in the Master Medicine table — this app never writes to it.
    """

    class Meta:
        model = MasterMedicine
        fields = [
            "MedicineId",
            "MedicineName",
            "Manufacturer",
            "GenericName",
            "Category",
            "CostValue",
            "MRP",
        ]
        read_only_fields = fields


class PharmacyStockSerializer(serializers.ModelSerializer):
    MedicineName = serializers.CharField(source="Medicine.MedicineName", read_only=True)

    class Meta:
        model = PharmacyStock
        fields = [
            "StockId",
            "Medicine",
            "MedicineName",
            "QuantityOnHand",
            "UnitPrice",
            "SellingPrice",
            "ReorderLevel",
            "LastUpdated",
        ]
        read_only_fields = ["StockId", "LastUpdated"]

    def validate_QuantityOnHand(self, value):
        if value < 0:
            raise serializers.ValidationError("Quantity on hand cannot be negative.")
        return value

    def validate_ReorderLevel(self, value):
        if value < 0:
            raise serializers.ValidationError("Reorder level cannot be negative.")
        return value

    def validate(self, data):
        unit_price = data.get("UnitPrice", getattr(self.instance, "UnitPrice", None))
        selling_price = data.get("SellingPrice", getattr(self.instance, "SellingPrice", None))
        if unit_price is not None and selling_price is not None and selling_price < unit_price:
            raise serializers.ValidationError(
                "Selling price cannot be lower than unit (cost) price."
            )

        # The shared PharmacyStock model has no unique constraint on Medicine,
        # so nothing stops two stock rows existing for the same medicine.
        # Enforced here at the app level; a DB-level unique=True on Medicine
        # would be the cleaner fix but that's a models.py change for the leader.
        medicine = data.get("Medicine", getattr(self.instance, "Medicine", None))
        if medicine is not None:
            existing = PharmacyStock.objects.filter(Medicine=medicine)
            if self.instance is not None:
                existing = existing.exclude(pk=self.instance.pk)
            duplicate = existing.first()
            if duplicate is not None:
                raise serializers.ValidationError(
                    f"A stock record for '{medicine.MedicineName}' already exists "
                    f"(Stock ID {duplicate.StockId}). Edit that record instead of "
                    "creating a duplicate."
                )
        return data


class PrescriptionItemSerializer(serializers.ModelSerializer):
    """Read-only line item shown inside the pharmacist's prescription queue."""

    MedicineName = serializers.CharField(source="MedicineId.MedicineName", read_only=True)
    Dosage = serializers.CharField(source="DosageId.DosageValue", read_only=True)
    DosageInstructions = serializers.CharField(source="DosageId.Instructions", read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = [
            "PrescriptionItemId",
            "MedicineId",
            "MedicineName",
            "Dosage",
            "DosageInstructions",
            "Duration",
            "Frequency",
        ]
        read_only_fields = fields


class PrescriptionQueueSerializer(serializers.ModelSerializer):
    """
    Read-only. The pharmacist can see a doctor's prescription in full detail
    but has no write fields here at all — editing a prescription is never
    exposed through this app.
    """

    PatientName = serializers.CharField(source="PatientId.Name", read_only=True)
    DoctorName = serializers.SerializerMethodField()
    items = PrescriptionItemSerializer(many=True, read_only=True)
    class Meta:
        model = Prescription
        fields = [
            "PrescriptionId",
            "PatientId",
            "PatientName",
            "DoctorId",
            "DoctorName",
            "PrescriptionDateTime",
            "Status",
            "items",
        ]
        read_only_fields = fields

    def get_DoctorName(self, obj):
        return obj.DoctorId.Name if obj.DoctorId else None


class DispenseItemInputSerializer(serializers.Serializer):
    """One line of what's actually being dispensed right now."""

    PrescriptionItemId = serializers.PrimaryKeyRelatedField(queryset=PrescriptionItem.objects.all())
    Quantity = serializers.IntegerField(min_value=1)


class DispenseRequestSerializer(serializers.Serializer):
    """
    Input for POST /api/pharmacist/prescriptions/{id}/dispense/.

    NOTE: PrescriptionItem stores Duration/Frequency as free text (e.g.
    "5 days", "twice a day") — there is no numeric prescribed-quantity field
    on the shared model. So the pharmacist confirms/enters the actual
    dispense quantity per item here, rather than the system reading a
    stored "quantity prescribed" value that doesn't exist.
    """

    items = DispenseItemInputSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required to dispense.")
        return value


class PharmacyBillItemSerializer(serializers.ModelSerializer):
    """
    Fully read-only. Bill items are only ever created inside the atomic
    dispense transaction (see services.dispense_prescription) — never via
    a direct POST here, so stock validation can't be bypassed.
    """

    MedicineName = serializers.CharField(source="Medicine.MedicineName", read_only=True)

    class Meta:
        model = PharmacyBillItem
        fields = ["BillItemId", "Bill", "Medicine", "MedicineName", "Quantity", "UnitPrice", "LineAmount"]
        read_only_fields = fields


class PharmacyBillSerializer(serializers.ModelSerializer):
    """Fully read-only for the same reason as PharmacyBillItemSerializer above."""

    PatientName = serializers.CharField(source="Patient.Name", read_only=True)
    DispensedByName = serializers.CharField(source="DispensedBy.Name", read_only=True)
    items = PharmacyBillItemSerializer(many=True, read_only=True)

    class Meta:
        model = PharmacyBill
        fields = [
            "BillId",
            "Patient",
            "PatientName",
            "Prescription",
            "DispensedBy",
            "DispensedByName",
            "BillDate",
            "TotalAmount",
            "items",
        ]
        read_only_fields = fields
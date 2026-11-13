from django.db.models import Count, F, Sum
from django.utils.dateparse import parse_date
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apibackendapp.models import Staff
from apibackendapp.permissions import IsPharmacistUser, IsCustomAuthenticated


from apibackendapp.models import (
    MasterMedicine,
    PharmacyBill,
    PharmacyBillItem,
    PharmacyStock,
    Prescription,
)
from .serializers import (
    DispenseRequestSerializer,
    MasterMedicineSerializer,
    PharmacyBillItemSerializer,
    PharmacyBillSerializer,
    PharmacyStockSerializer,
    PrescriptionQueueSerializer,
)
from .services import DispenseError, dispense_prescription


class MasterMedicineViewSet(viewsets.ReadOnlyModelViewSet):
    """Pharmacist looks medicines up here. Creating/editing is Admin's job —
    read-only enforces that at the API level, not just by convention."""

    queryset = MasterMedicine.objects.all().order_by("MedicineName")
    serializer_class = MasterMedicineSerializer
    permission_classes = [IsCustomAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["MedicineName", "GenericName"]


class PharmacyStockViewSet(viewsets.ModelViewSet):
    queryset = PharmacyStock.objects.select_related("Medicine").all()
    serializer_class = PharmacyStockSerializer
    permission_classes = [IsPharmacistUser]


class PrescriptionQueueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Incoming prescription queue plus the dispense action. Read-only on the
    prescription itself: the pharmacist can view it in full detail but has
    no path in this app to edit a doctor's prescription.
    """

    serializer_class = PrescriptionQueueSerializer
    permission_classes = [IsPharmacistUser]


    def get_queryset(self):
        # "Finalized" prescriptions = not already fully dispensed. The
        # shared Prescription model has no separate draft/final flag, so
        # this is the closest equivalent — see "Assumptions" in chat.
        return (
            Prescription.objects.exclude(Status="Dispensed")
            .select_related("PatientId", "DoctorId")
            .prefetch_related("items__MedicineId", "items__DosageId")
            .order_by("PrescriptionDateTime")
        )

    @action(detail=True, methods=["post"])
    def dispense(self, request, pk=None):
        prescription = self.get_object()

        input_serializer = DispenseRequestSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        staff = getattr(request.user, "staff_profile", None) or (Staff.objects.filter(UserId=request.user).first() if request.user else None)
        if staff is None:
            return Response(
                {
                    "detail": (
                        "Authenticated user has no linked Staff record; "
                        "cannot record who dispensed this. This will resolve "
                        "once request.user reliably resolves to a Staff-linked "
                        "account — see the auth blocker noted in chat."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            bill = dispense_prescription(
                prescription=prescription,
                items_data=input_serializer.validated_data["items"],
                dispensing_staff=staff,
            )
        except DispenseError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(PharmacyBillSerializer(bill).data, status=status.HTTP_201_CREATED)


class PharmacyBillViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only. Bills are only ever created through the dispense action
    (see PrescriptionQueueViewSet.dispense), never posted here directly, so
    client-supplied totals can never be trusted and stock validation can
    never be bypassed.
    """

    queryset = (
        PharmacyBill.objects.select_related("Patient", "Prescription", "DispensedBy")
        .prefetch_related("items__Medicine")
        .all()
        .order_by("-BillDate")
    )
    serializer_class = PharmacyBillSerializer
    permission_classes = [permissions.IsAuthenticated]


class PharmacyBillItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only, same reasoning as PharmacyBillViewSet above."""

    queryset = PharmacyBillItem.objects.select_related("Bill", "Medicine").all()
    serializer_class = PharmacyBillItemSerializer
    permission_classes = [permissions.IsAuthenticated]


class PharmacyRevenueReportView(APIView):
    permission_classes = [IsPharmacistUser]

    def get(self, request):
        from_date_str = request.query_params.get("from_date")
        to_date_str = request.query_params.get("to_date")

        from_date = parse_date(from_date_str) if from_date_str else None
        to_date = parse_date(to_date_str) if to_date_str else None

        if from_date_str and from_date is None:
            return Response(
                {"detail": "Invalid from_date. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST
            )
        if to_date_str and to_date is None:
            return Response(
                {"detail": "Invalid to_date. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST
            )
        if from_date and to_date and from_date > to_date:
            return Response(
                {"detail": "from_date cannot be after to_date."}, status=status.HTTP_400_BAD_REQUEST
            )

        bills = PharmacyBill.objects.all()
        if from_date:
            bills = bills.filter(BillDate__gte=from_date)
        if to_date:
            bills = bills.filter(BillDate__lte=to_date)

        summary = bills.aggregate(bill_count=Count("BillId"), total_revenue=Sum("TotalAmount"))

        return Response(
            {
                "from_date": from_date_str,
                "to_date": to_date_str,
                "number_of_bills": summary["bill_count"] or 0,
                "total_revenue": summary["total_revenue"] or 0,
            }
        )


class PharmacyReorderReportView(APIView):
    permission_classes = [IsPharmacistUser]

    def get(self, request):
        low_stock = (
            PharmacyStock.objects.select_related("Medicine")
            .filter(QuantityOnHand__lte=F("ReorderLevel"))
            .order_by("QuantityOnHand")
        )

        results = [
            {
                "MedicineId": row.Medicine.MedicineId,
                "MedicineName": row.Medicine.MedicineName,
                "QuantityOnHand": row.QuantityOnHand,
                "ReorderLevel": row.ReorderLevel,
                "UnitPrice": row.UnitPrice,
                "SellingPrice": row.SellingPrice,
                "StockStatus": "Out of stock" if row.QuantityOnHand <= 0 else "Below reorder level",
            }
            for row in low_stock
        ]

        return Response({"count": len(results), "results": results})
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    MasterMedicineViewSet,
    PharmacyBillItemViewSet,
    PharmacyBillViewSet,
    PharmacyReorderReportView,
    PharmacyRevenueReportView,
    PharmacyStockViewSet,
    PrescriptionQueueViewSet,
)

router = DefaultRouter()
router.register(r"medicines", MasterMedicineViewSet, basename="medicine")
router.register(r"stock", PharmacyStockViewSet, basename="pharmacy-stock")
router.register(r"prescriptions", PrescriptionQueueViewSet, basename="pharmacy-prescription")
router.register(r"bills", PharmacyBillViewSet, basename="pharmacy-bill")
router.register(r"bill-items", PharmacyBillItemViewSet, basename="pharmacy-bill-item")

urlpatterns = router.urls + [
    path("reports/revenue/", PharmacyRevenueReportView.as_view(), name="pharmacy-revenue-report"),
    path("reports/reorder/", PharmacyReorderReportView.as_view(), name="pharmacy-reorder-report"),
    path("revenue-report/", PharmacyRevenueReportView.as_view(), name="pharmacy-revenue-report-alias"),
    path("reorder-report/", PharmacyReorderReportView.as_view(), name="pharmacy-reorder-report-alias"),
]

# Full endpoint list under /api/pharmacist/:
#   GET        medicines/                  — search/list (read-only)
#   GET        medicines/<id>/
#   GET/POST   stock/                      — full CRUD
#   GET/PUT    stock/<id>/
#   GET        prescriptions/              — incoming queue (read-only)
#   GET        prescriptions/<id>/         — detail with items
#   POST       prescriptions/<id>/dispense/ — the dispensing action
#   GET        bills/                      — read-only, created via dispense only
#   GET        bills/<id>/
#   GET        bill-items/                 — read-only
#   GET        reports/revenue/?from_date=&to_date=
#   GET        reports/reorder/
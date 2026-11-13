from django.contrib import admin
from apibackendapp.models import PharmacyStock, PharmacyBill, PharmacyBillItem
# Register your models here.
from django.contrib import admin
from apibackendapp.models import MasterMedicine

admin.site.register(MasterMedicine)
admin.site.register(PharmacyBillItem)
@admin.register(PharmacyStock)
class PharmacyStockAdmin(admin.ModelAdmin):
    list_display = ["StockId", "Medicine", "QuantityOnHand", "SellingPrice", "ReorderLevel"]
    list_filter = ["ReorderLevel"]
    search_fields = ["Medicine__MedicineName"]


class PharmacyBillItemInline(admin.TabularInline):
    model = PharmacyBillItem
    extra = 1


@admin.register(PharmacyBill)
class PharmacyBillAdmin(admin.ModelAdmin):
    list_display = ["BillId", "Patient", "DispensedBy", "BillDate", "TotalAmount"]
    inlines = [PharmacyBillItemInline]
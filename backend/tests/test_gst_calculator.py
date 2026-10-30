import pytest
from decimal import Decimal

from app.services.gst.calculator import GSTCalculator, _to_decimal, _to_rate_decimal
from app.services.gst.schemas import SupplyType, GSTStatus


class TestGSTCalculator:
    """
    Comprehensive test suite for the deterministic GST Calculator.
    Validates Python Decimal arithmetic, statutory state mappings, component rules,
    inclusive/exclusive modes, and tolerance handling.
    """

    # 1. Intra-State GST (CGST + SGST)
    def test_intra_state_gst_standard_18_percent(self):
        # Karnataka (29) -> Karnataka (29)
        extracted = {
            "supplier": {
                "name": "Karnataka Cloud Tech Pvt Ltd",
                "gstin": "29ABCDE1234F1Z5"
            },
            "financials": {
                "subtotal": 100000.00,
                "cgst": 9000.00,
                "sgst": 9000.00,
                "igst": 0.00,
                "grand_total": 118000.00
            },
            "items": [
                {
                    "description": "Enterprise Cloud Architecture",
                    "quantity": 1.0,
                    "unit_price": 100000.00,
                    "tax_rate": 0.18,
                    "total": 100000.00
                }
            ]
        }
        res = GSTCalculator.verify_invoice_gst(extracted, recipient_gstin="29XYZAB5678C1Z2")
        assert res.status == GSTStatus.PASS
        assert res.supply_type == SupplyType.INTRA_STATE
        assert res.supplier_state_code == "29"
        assert res.recipient_state_code == "29"
        assert res.calculated_breakdown.cgst == 9000.00
        assert res.calculated_breakdown.sgst == 9000.00
        assert res.calculated_breakdown.igst == 0.00
        assert res.calculated_breakdown.grand_total == 118000.00
        assert len(res.discrepancies) == 0

    # 2. Inter-State GST (IGST)
    def test_inter_state_gst_standard_18_percent(self):
        # Maharashtra (27) -> Karnataka (29)
        extracted = {
            "supplier": {
                "name": "Mumbai Software Hub LLP",
                "gstin": "27AABCT2345Q1ZS"
            },
            "financials": {
                "subtotal": 50000.00,
                "cgst": 0.00,
                "sgst": 0.00,
                "igst": 9000.00,
                "grand_total": 59000.00
            },
            "items": [
                {
                    "description": "Dedicated Consulting Hours",
                    "quantity": 50.0,
                    "unit_price": 1000.00,
                    "tax_rate": 0.18,
                    "total": 50000.00
                }
            ]
        }
        res = GSTCalculator.verify_invoice_gst(extracted, recipient_gstin="29XYZAB5678C1Z2")
        assert res.status == GSTStatus.PASS
        assert res.supply_type == SupplyType.INTER_STATE
        assert res.supplier_state_code == "27"
        assert res.recipient_state_code == "29"
        assert res.calculated_breakdown.igst == 9000.00
        assert res.calculated_breakdown.cgst == 0.00
        assert res.calculated_breakdown.sgst == 0.00
        assert res.calculated_breakdown.grand_total == 59000.00
        assert len(res.discrepancies) == 0

    # 3. Union Territory GST (UTGST)
    def test_union_territory_utgst(self):
        # Chandigarh (04) is a UT without state legislature -> CGST + UTGST applies
        extracted = {
            "supplier": {
                "name": "Chandigarh Hardware Supplies",
                "gstin": "04AAAAA0000A1Z5"
            },
            "financials": {
                "subtotal": 10000.00,
                "cgst": 900.00,
                "utgst": 900.00,
                "igst": 0.00,
                "grand_total": 11800.00
            },
            "items": [
                {
                    "description": "Network Equipment",
                    "quantity": 2.0,
                    "unit_price": 5000.00,
                    "tax_rate": 0.18,
                    "total": 10000.00
                }
            ]
        }
        # Recipient is also in Chandigarh (04)
        res = GSTCalculator.verify_invoice_gst(extracted, recipient_gstin="04BBBBB1111B1Z9")
        assert res.status == GSTStatus.PASS
        assert res.supply_type == SupplyType.UNION_TERRITORY
        assert res.is_utgst_applicable is True
        assert res.calculated_breakdown.cgst == 900.00
        assert res.calculated_breakdown.utgst == 900.00
        assert res.calculated_breakdown.igst == 0.00

    # 4. GST-Inclusive Calculation
    def test_gst_inclusive_calculation(self):
        # Gross total ₹1,180 with 18% inclusive GST
        # Taxable should be ₹1,000.00, Tax should be ₹180.00
        line_res = GSTCalculator.calculate_line_item(
            description="Inclusive Retail Item",
            quantity=1.0,
            unit_price=1180.00,
            tax_rate=0.18,
            supply_type=SupplyType.INTRA_STATE,
            is_inclusive=True
        )
        assert line_res.taxable_amount == 1000.00
        assert line_res.total_tax == 180.00
        assert line_res.cgst == 90.00
        assert line_res.sgst == 90.00
        assert line_res.line_total == 1180.00

    # 5. Multiple Line Items with Mixed Tax Slabs (5%, 12%, 18%)
    def test_multiple_line_items_mixed_slabs(self):
        extracted = {
            "supplier": {
                "name": "Multi-Goods Distributor",
                "gstin": "29AAAAA1111A1Z1"
            },
            "financials": {
                "subtotal": 17000.00,
                "cgst": 1250.00,
                "sgst": 1250.00,
                "igst": 0.00,
                "grand_total": 19500.00
            },
            "items": [
                {
                    "description": "Essential Supplies (5%)",
                    "quantity": 10.0,
                    "unit_price": 200.00,
                    "tax_rate": 0.05,
                    "total": 2000.00
                },
                {
                    "description": "Processed Materials (12%)",
                    "quantity": 5.0,
                    "unit_price": 1000.00,
                    "tax_rate": 0.12,
                    "total": 5000.00
                },
                {
                    "description": "Technical Services (18%)",
                    "quantity": 1.0,
                    "unit_price": 10000.00,
                    "tax_rate": 0.18,
                    "total": 10000.00
                }
            ]
        }
        res = GSTCalculator.verify_invoice_gst(extracted, recipient_gstin="29BBBBB2222B1Z2")
        assert res.status == GSTStatus.PASS
        # Item 1 tax: 2000 * 5% = 100 (CGST 50, SGST 50)
        # Item 2 tax: 5000 * 12% = 600 (CGST 300, SGST 300)
        # Item 3 tax: 10000 * 18% = 1800 (CGST 900, SGST 900)
        # Total Tax = 2500 (CGST 1250, SGST 1250) ? Wait:
        # 50 + 300 + 900 = 1250.
        # But extracted financials had 1390? Let's check:
        # If financials in extracted are 1390, that should flag mismatch!
        # Let's fix the test fixture to exact math:
        # Subtotal: 17000. Total Tax: 2500. Grand Total: 19500.
        pass

    def test_multiple_line_items_exact_math(self):
        extracted = {
            "supplier": {
                "name": "Multi-Goods Distributor",
                "gstin": "29AAAAA1111A1Z1"
            },
            "financials": {
                "subtotal": 17000.00,
                "cgst": 1250.00,
                "sgst": 1250.00,
                "igst": 0.00,
                "grand_total": 19500.00
            },
            "items": [
                {
                    "description": "Essential Supplies (5%)",
                    "quantity": 10.0,
                    "unit_price": 200.00,
                    "tax_rate": 0.05,
                    "total": 2000.00
                },
                {
                    "description": "Processed Materials (12%)",
                    "quantity": 5.0,
                    "unit_price": 1000.00,
                    "tax_rate": 0.12,
                    "total": 5000.00
                },
                {
                    "description": "Technical Services (18%)",
                    "quantity": 1.0,
                    "unit_price": 10000.00,
                    "tax_rate": 0.18,
                    "total": 10000.00
                }
            ]
        }
        res = GSTCalculator.verify_invoice_gst(extracted, recipient_gstin="29BBBBB2222B1Z2")
        assert res.status == GSTStatus.PASS
        assert res.calculated_breakdown.taxable_amount == 17000.00
        assert res.calculated_breakdown.cgst == 1250.00
        assert res.calculated_breakdown.sgst == 1250.00
        assert res.calculated_breakdown.grand_total == 19500.00

    # 6. Rounding Differences within and exceeding tolerance
    def test_rounding_within_tolerance(self):
        # Invoiced grand total is off by ₹0.02 (within ₹0.05 tolerance)
        extracted = {
            "supplier": {
                "name": "Precision Tools Ltd",
                "gstin": "29AAAAA0000A1Z5"
            },
            "financials": {
                "subtotal": 1000.00,
                "cgst": 90.00,
                "sgst": 90.00,
                "igst": 0.00,
                "grand_total": 1180.02  # off by 0.02
            },
            "items": [
                {
                    "description": "Small Hardware Part",
                    "quantity": 1.0,
                    "unit_price": 1000.00,
                    "tax_rate": 0.18,
                    "total": 1000.00
                }
            ]
        }
        res = GSTCalculator.verify_invoice_gst(extracted, tolerance=Decimal("0.05"), recipient_gstin="29BBBBB1111B1Z9")
        assert res.status == GSTStatus.PASS
        assert res.variance["grand_total_diff"] == 0.02

    def test_rounding_exceeding_tolerance(self):
        # Invoiced grand total is off by ₹0.50 (exceeds ₹0.05 tolerance)
        extracted = {
            "supplier": {
                "name": "Precision Tools Ltd",
                "gstin": "29AAAAA0000A1Z5"
            },
            "financials": {
                "subtotal": 1000.00,
                "cgst": 90.00,
                "sgst": 90.00,
                "igst": 0.00,
                "grand_total": 1180.50  # off by 0.50
            },
            "items": [
                {
                    "description": "Small Hardware Part",
                    "quantity": 1.0,
                    "unit_price": 1000.00,
                    "tax_rate": 0.18,
                    "total": 1000.00
                }
            ]
        }
        res = GSTCalculator.verify_invoice_gst(extracted, tolerance=Decimal("0.05"), recipient_gstin="29BBBBB1111B1Z9")
        assert res.status == GSTStatus.MISMATCH
        assert any(d.code == "GRAND_TOTAL_MISMATCH" for d in res.discrepancies)

    # 7. Incorrect Tax Components (IGST charged on Intra-State)
    def test_incorrect_tax_component_igst_on_intrastate(self):
        # Both in Karnataka (29), but invoice incorrectly charged IGST instead of CGST + SGST
        extracted = {
            "supplier": {
                "name": "Karnataka Vendor",
                "gstin": "29AAAAA0000A1Z5"
            },
            "financials": {
                "subtotal": 10000.00,
                "cgst": 0.00,
                "sgst": 0.00,
                "igst": 1800.00,  # Invalid for intra-state!
                "grand_total": 11800.00
            },
            "items": [
                {
                    "description": "Local Consulting",
                    "quantity": 1.0,
                    "unit_price": 10000.00,
                    "tax_rate": 0.18,
                    "total": 10000.00
                }
            ]
        }
        res = GSTCalculator.verify_invoice_gst(extracted, recipient_gstin="29BBBBB1111B1Z9")
        assert res.status == GSTStatus.MISMATCH
        assert any(d.code == "INCORRECT_TAX_COMPONENT_IGST" for d in res.discrepancies)

    # 8. Incorrect Tax Components (CGST/SGST charged on Inter-State)
    def test_incorrect_tax_component_cgst_on_interstate(self):
        # Delhi (07) -> Karnataka (29), but invoice charged CGST/SGST instead of IGST
        extracted = {
            "supplier": {
                "name": "Delhi Supplier",
                "gstin": "07AAAAA0000A1Z5"
            },
            "financials": {
                "subtotal": 10000.00,
                "cgst": 900.00,
                "sgst": 900.00,
                "igst": 0.00,
                "grand_total": 11800.00
            },
            "items": [
                {
                    "description": "Inter-state Goods",
                    "quantity": 1.0,
                    "unit_price": 10000.00,
                    "tax_rate": 0.18,
                    "total": 10000.00
                }
            ]
        }
        res = GSTCalculator.verify_invoice_gst(extracted, recipient_gstin="29BBBBB1111B1Z9")
        assert res.status == GSTStatus.MISMATCH
        assert any(d.code == "INCORRECT_TAX_COMPONENT_CGST_SGST" for d in res.discrepancies)

    # 9. Asymmetric CGST and SGST
    def test_asymmetric_cgst_sgst(self):
        extracted = {
            "supplier": {
                "name": "Local Vendor",
                "gstin": "29AAAAA0000A1Z5"
            },
            "financials": {
                "subtotal": 10000.00,
                "cgst": 950.00,  # Unequal
                "sgst": 850.00,
                "igst": 0.00,
                "grand_total": 11800.00
            },
            "items": [
                {
                    "description": "Item",
                    "quantity": 1.0,
                    "unit_price": 10000.00,
                    "tax_rate": 0.18,
                    "total": 10000.00
                }
            ]
        }
        res = GSTCalculator.verify_invoice_gst(extracted, recipient_gstin="29BBBBB1111B1Z9")
        assert res.status == GSTStatus.MISMATCH
        assert any(d.code == "ASYMMETRIC_CGST_SGST" for d in res.discrepancies)

    # 10. Missing GSTIN
    def test_missing_gstin(self):
        extracted = {
            "supplier": {
                "name": "Unregistered Vendor",
                "gstin": None
            },
            "financials": {
                "subtotal": 1000.00,
                "grand_total": 1180.00
            }
        }
        res = GSTCalculator.verify_invoice_gst(extracted)
        assert res.status == GSTStatus.INSUFFICIENT_DATA
        assert res.requires_human_review is True
        assert any(d.code == "MISSING_GSTIN" for d in res.discrepancies)

    # 11. Invalid GSTIN Structure
    def test_invalid_gstin_structure(self):
        extracted = {
            "supplier": {
                "name": "Vendor with malformed GST",
                "gstin": "INVALID123"  # Only 10 chars
            },
            "financials": {
                "subtotal": 1000.00,
                "grand_total": 1180.00
            }
        }
        res = GSTCalculator.verify_invoice_gst(extracted)
        assert res.status == GSTStatus.MISMATCH
        assert any(d.code == "INVALID_GSTIN_STRUCTURE" for d in res.discrepancies)

    # 12. Place of Supply Conflict Resolution
    def test_place_of_supply_override(self):
        # Supplier in Maharashtra (27), Recipient GSTIN in Maharashtra (27),
        # but Place of Supply is specified as Karnataka (29) -> becomes INTER_STATE
        supply_type, _, _, rec_code, _, _ = GSTCalculator.determine_supply_type(
            supplier_gstin="27AAAAA0000A1Z5",
            recipient_gstin="27BBBBB1111B1Z9",
            place_of_supply_code="29"
        )
        assert supply_type == SupplyType.INTER_STATE
        assert rec_code == "29"

    # 13. Malformed numeric inputs (Negative numbers, corrupted string values)
    def test_malformed_input_resilience(self):
        dec = _to_decimal("₹ 1,234.56.78")  # corrupted string
        assert isinstance(dec, Decimal)
        
        rate = _to_rate_decimal("18%")
        assert rate == Decimal("0.18")

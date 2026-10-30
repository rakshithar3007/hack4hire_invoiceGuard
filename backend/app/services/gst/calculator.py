import re
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Dict, Any, List, Optional, Tuple

from app.services.gst.config import (
    STATE_CODE_MAPPING,
    VALID_GST_RATES,
    DEFAULT_GST_TOLERANCE_INR,
)
from app.services.gst.schemas import (
    SupplyType,
    GSTStatus,
    GSTResult,
    GSTLineItemResult,
    TaxBreakdown,
    GSTDiscrepancy,
)

TWOPLACES = Decimal("0.01")

def _to_decimal(val: Any) -> Decimal:
    """Safely converts float/int/str to Decimal quantized to 2 decimal places."""
    if val is None:
        return Decimal("0.00")
    if isinstance(val, Decimal):
        return val.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    try:
        # Clean currency strings if needed
        clean_str = re.sub(r"[^\d.-]", "", str(val).replace(",", ""))
        if not clean_str or clean_str == "-":
            return Decimal("0.00")
        return Decimal(clean_str).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        return Decimal("0.00")

def _to_rate_decimal(val: Any) -> Decimal:
    """Converts a rate input (e.g. 18, 0.18, '18%') to Decimal rate fraction (0.18)."""
    if val is None:
        return Decimal("0.18")  # Standard fallback rate
    if isinstance(val, Decimal):
        return val if val <= 1 else (val / Decimal("100"))
    try:
        clean = re.sub(r"[^\d.]", "", str(val))
        d = Decimal(clean)
        return (d / Decimal("100")) if d > 1 else d
    except (InvalidOperation, ValueError):
        return Decimal("0.18")


class GSTCalculator:
    """
    Deterministic, zero-LLM GST Calculation and Verification Engine.
    Operates strictly with Python Decimal arithmetic (ROUND_HALF_UP).
    Independent of LangGraph, database, LLMs, and network APIs.
    """

    @staticmethod
    def validate_gstin(gstin: Optional[str]) -> Tuple[bool, Optional[str], Optional[str], Optional[str]]:
        """
        Validates 15-character GSTIN structure and extracts state information.
        Returns: (is_valid, state_code, state_name, error_reason)
        """
        if not gstin or not isinstance(gstin, str):
            return False, None, None, "GSTIN is missing or empty"
        
        clean = gstin.strip().upper()
        if len(clean) != 15:
            return False, None, None, f"GSTIN must be exactly 15 characters, got {len(clean)}"
        
        pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
        if not re.match(pattern, clean):
            return False, None, None, f"GSTIN '{clean}' does not match statutory alphanumeric pattern"
        
        state_code = clean[:2]
        state_info = STATE_CODE_MAPPING.get(state_code)
        if not state_info:
            return False, state_code, None, f"State code '{state_code}' is not a recognized statutory Indian state/UT code"
        
        return True, state_code, str(state_info["name"]), None

    @classmethod
    def determine_supply_type(
        cls,
        supplier_gstin: Optional[str],
        recipient_gstin: Optional[str] = None,
        place_of_supply_code: Optional[str] = None,
        is_export: bool = False,
        is_rcm: bool = False
    ) -> Tuple[SupplyType, Optional[str], Optional[str], Optional[str], Optional[str], bool]:
        """
        Determines whether the transaction is INTRA_STATE, UNION_TERRITORY, or INTER_STATE.
        Returns: (supply_type, sup_state_code, sup_state_name, rec_state_code, rec_state_name, is_utgst)
        """
        if is_rcm:
            return SupplyType.UNSUPPORTED, None, None, None, None, False
        if is_export:
            return SupplyType.EXPORT_ZERO_RATED, None, None, None, None, False

        is_sup_valid, sup_code, sup_name, _ = cls.validate_gstin(supplier_gstin)
        if not is_sup_valid or not sup_code:
            return SupplyType.UNSUPPORTED, None, None, None, None, False

        # Recipient state resolution:
        # 1. Explicit Place of Supply 2-digit code
        # 2. Recipient GSTIN
        # 3. Default to buyer's registered entity state (29 Karnataka by default)
        rec_code = None
        rec_name = None

        if place_of_supply_code and str(place_of_supply_code).zfill(2) in STATE_CODE_MAPPING:
            rec_code = str(place_of_supply_code).zfill(2)
            rec_name = str(STATE_CODE_MAPPING[rec_code]["name"])
        elif recipient_gstin:
            is_rec_valid, r_code, r_name, _ = cls.validate_gstin(recipient_gstin)
            if is_rec_valid and r_code:
                rec_code = r_code
                rec_name = r_name
        
        if not rec_code:
            # Default to Buyer Platform registered state (Karnataka - 29)
            rec_code = "29"
            rec_name = "Karnataka"

        is_utgst = bool(STATE_CODE_MAPPING.get(sup_code, {}).get("has_utgst", False))

        if sup_code == rec_code:
            if is_utgst:
                return SupplyType.UNION_TERRITORY, sup_code, sup_name, rec_code, rec_name, True
            return SupplyType.INTRA_STATE, sup_code, sup_name, rec_code, rec_name, False
        else:
            return SupplyType.INTER_STATE, sup_code, sup_name, rec_code, rec_name, False

    @classmethod
    def calculate_line_item(
        cls,
        description: str,
        quantity: Any,
        unit_price: Any,
        tax_rate: Any,
        supply_type: SupplyType,
        is_inclusive: bool = False,
        explicit_taxable: Any = None
    ) -> GSTLineItemResult:
        """
        Calculates exact taxable base and component taxes for an individual line item.
        """
        qty = _to_decimal(quantity)
        if qty <= Decimal("0.00"):
            qty = Decimal("1.00")
        
        price = _to_decimal(unit_price)
        rate = _to_rate_decimal(tax_rate)
        
        if is_inclusive:
            gross = explicit_taxable if explicit_taxable is not None else (qty * price)
            gross = _to_decimal(gross)
            # Taxable = Gross / (1 + Rate)
            taxable = (gross / (Decimal("1.00") + rate)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            total_tax = gross - taxable
        else:
            if explicit_taxable is not None:
                taxable = _to_decimal(explicit_taxable)
            else:
                taxable = (qty * price).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            total_tax = (taxable * rate).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        cgst = Decimal("0.00")
        sgst = Decimal("0.00")
        utgst = Decimal("0.00")
        igst = Decimal("0.00")

        if supply_type == SupplyType.INTRA_STATE:
            half_rate = rate / Decimal("2.00")
            cgst = (taxable * half_rate).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            sgst = total_tax - cgst  # Ensures components sum exactly to total_tax
        elif supply_type == SupplyType.UNION_TERRITORY:
            half_rate = rate / Decimal("2.00")
            cgst = (taxable * half_rate).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            utgst = total_tax - cgst
        elif supply_type == SupplyType.INTER_STATE:
            igst = total_tax
        else:
            # Unsupported or zero-rated
            total_tax = Decimal("0.00")

        line_total = (taxable + total_tax).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        return GSTLineItemResult(
            description=description,
            quantity=float(qty),
            unit_price=float(price),
            taxable_amount=float(taxable),
            tax_rate=float(rate),
            cgst=float(cgst),
            sgst=float(sgst),
            utgst=float(utgst),
            igst=float(igst),
            total_tax=float(total_tax),
            line_total=float(line_total),
            is_inclusive=is_inclusive
        )

    @classmethod
    def verify_invoice_gst(
        cls,
        extracted_data: Dict[str, Any],
        tolerance: Decimal = DEFAULT_GST_TOLERANCE_INR,
        recipient_gstin: Optional[str] = None,
        place_of_supply_code: Optional[str] = None
    ) -> GSTResult:
        """
        Performs end-to-end deterministic GST verification on extracted invoice data.
        """
        supplier_info = extracted_data.get("supplier", {})
        financial_info = extracted_data.get("financials", {})
        raw_items = extracted_data.get("items", [])
        inv_details = extracted_data.get("invoice_details", {})

        supplier_gstin = supplier_info.get("gstin")
        
        # 1. Missing or unparseable input check
        if not supplier_gstin:
            return GSTResult(
                status=GSTStatus.INSUFFICIENT_DATA,
                supply_type=SupplyType.UNSUPPORTED,
                calculated_breakdown=TaxBreakdown(),
                discrepancies=[
                    GSTDiscrepancy(
                        code="MISSING_GSTIN",
                        field="supplier.gstin",
                        message="Supplier GSTIN is missing. Cannot determine Place of Supply or tax liability.",
                        expected="15-digit valid statutory GSTIN",
                        actual=None
                    )
                ],
                explanation="GST verification halted: Supplier GSTIN was not extracted from invoice.",
                recommendation="Route to manual AP review to enter supplier GSTIN.",
                requires_human_review=True
            )

        # 2. Validate GSTIN
        is_gstin_valid, sup_code, sup_name, gstin_err = cls.validate_gstin(supplier_gstin)
        if not is_gstin_valid:
            return GSTResult(
                status=GSTStatus.MISMATCH,
                supply_type=SupplyType.UNSUPPORTED,
                calculated_breakdown=TaxBreakdown(),
                discrepancies=[
                    GSTDiscrepancy(
                        code="INVALID_GSTIN_STRUCTURE",
                        field="supplier.gstin",
                        message=gstin_err or "Invalid GSTIN structure",
                        expected="15-digit alphanumeric format (State + PAN + Entity + Z + Check)",
                        actual=supplier_gstin
                    )
                ],
                explanation=f"Statutory GSTIN check failed: {gstin_err}",
                recommendation="Reject invoice or request corrected tax invoice from vendor.",
                requires_human_review=True
            )

        # 3. Determine Supply Type
        # Check if invoice details contain Place of Supply (e.g. POS: 29 or POS: Karnataka)
        pos_code = place_of_supply_code
        if not pos_code and inv_details.get("place_of_supply"):
            pos_raw = str(inv_details.get("place_of_supply")).strip()
            if pos_raw[:2].isdigit():
                pos_code = pos_raw[:2]

        supply_type, sup_st_code, sup_st_name, rec_st_code, rec_st_name, is_utgst = cls.determine_supply_type(
            supplier_gstin=supplier_gstin,
            recipient_gstin=recipient_gstin,
            place_of_supply_code=pos_code
        )

        # 4. Calculate Line Items
        line_item_results: List[GSTLineItemResult] = []
        calc_taxable = Decimal("0.00")
        calc_cgst = Decimal("0.00")
        calc_sgst = Decimal("0.00")
        calc_utgst = Decimal("0.00")
        calc_igst = Decimal("0.00")
        calc_total_tax = Decimal("0.00")
        calc_grand_total = Decimal("0.00")

        # If items are present, calculate per item
        if raw_items:
            for item in raw_items:
                desc = item.get("description", "Invoice Item")
                qty = item.get("quantity", 1.0)
                price = item.get("unit_price", 0.0)
                rate = item.get("tax_rate")
                is_incl = item.get("is_inclusive", False)
                tot = item.get("total")

                # If rate is not specified per item, check if rate can be derived from tax/taxable
                if rate is None:
                    item_tax = _to_decimal(item.get("tax"))
                    item_tot = _to_decimal(tot)
                    if item_tot > Decimal("0.00") and item_tax > Decimal("0.00"):
                        derived_rate = (item_tax / item_tot).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
                        # Check nearest standard slab
                        rate = float(derived_rate)
                    else:
                        rate = 0.18  # default standard slab

                res = cls.calculate_line_item(
                    description=desc,
                    quantity=qty,
                    unit_price=price,
                    tax_rate=rate,
                    supply_type=supply_type,
                    is_inclusive=is_incl,
                    explicit_taxable=tot if (is_incl or price == 0) else None
                )
                line_item_results.append(res)
                
                calc_taxable += _to_decimal(res.taxable_amount)
                calc_cgst += _to_decimal(res.cgst)
                calc_sgst += _to_decimal(res.sgst)
                calc_utgst += _to_decimal(res.utgst)
                calc_igst += _to_decimal(res.igst)
                calc_total_tax += _to_decimal(res.total_tax)
                calc_grand_total += _to_decimal(res.line_total)
        else:
            # Fallback to financial summary if line items were unparsed
            ext_sub = _to_decimal(financial_info.get("subtotal"))
            if ext_sub <= Decimal("0.00"):
                ext_sub = _to_decimal(financial_info.get("grand_total")) / Decimal("1.18")
                ext_sub = ext_sub.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            
            calc_taxable = ext_sub
            rate = Decimal("0.18")
            calc_total_tax = (calc_taxable * rate).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            if supply_type == SupplyType.INTRA_STATE:
                calc_cgst = (calc_taxable * Decimal("0.09")).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
                calc_sgst = calc_total_tax - calc_cgst
            elif supply_type == SupplyType.UNION_TERRITORY:
                calc_cgst = (calc_taxable * Decimal("0.09")).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
                calc_utgst = calc_total_tax - calc_cgst
            else:
                calc_igst = calc_total_tax
            
            calc_grand_total = calc_taxable + calc_total_tax

        calculated_breakdown = TaxBreakdown(
            taxable_amount=float(calc_taxable),
            cgst=float(calc_cgst),
            sgst=float(calc_sgst),
            utgst=float(calc_utgst),
            igst=float(calc_igst),
            total_tax=float(calc_total_tax),
            grand_total=float(calc_grand_total)
        )

        # 5. Extract Extracted Numbers for Comparison
        ext_taxable = _to_decimal(financial_info.get("subtotal"))
        ext_cgst = _to_decimal(financial_info.get("cgst"))
        ext_sgst = _to_decimal(financial_info.get("sgst"))
        ext_utgst = _to_decimal(financial_info.get("utgst"))
        ext_igst = _to_decimal(financial_info.get("igst"))

        # If UTGST supply, accept either utgst or sgst (common invoice print format "SGST/UTGST")
        if is_utgst and ext_utgst == Decimal("0.00") and ext_sgst > Decimal("0.00"):
            ext_utgst = ext_sgst
            ext_sgst = Decimal("0.00")

        ext_total_tax = ext_cgst + ext_sgst + ext_utgst + ext_igst
        ext_grand = _to_decimal(financial_info.get("grand_total"))

        extracted_breakdown = TaxBreakdown(
            taxable_amount=float(ext_taxable),
            cgst=float(ext_cgst),
            sgst=float(ext_sgst),
            utgst=float(ext_utgst),
            igst=float(ext_igst),
            total_tax=float(ext_total_tax),
            grand_total=float(ext_grand)
        )

        # 6. Discrepancy Auditing & Validation Checks
        discrepancies: List[GSTDiscrepancy] = []

        # A. Tax Component Correctness
        if supply_type == SupplyType.INTRA_STATE:
            if ext_igst > Decimal("0.00"):
                discrepancies.append(GSTDiscrepancy(
                    code="INCORRECT_TAX_COMPONENT_IGST",
                    field="financials.igst",
                    message=(
                        f"IGST (₹{ext_igst}) was charged on an INTRA-STATE supply "
                        f"(Supplier: {sup_st_name} [{sup_st_code}] -> Recipient: {rec_st_name} [{rec_st_code}]). "
                        "Intra-state transactions require CGST + SGST."
                    ),
                    expected=0.0,
                    actual=float(ext_igst)
                ))
            if ext_cgst > Decimal("0.00") and ext_sgst > Decimal("0.00"):
                # Asymmetry check
                if abs(ext_cgst - ext_sgst) > tolerance:
                    discrepancies.append(GSTDiscrepancy(
                        code="ASYMMETRIC_CGST_SGST",
                        field="financials.cgst_sgst",
                        message=f"CGST (₹{ext_cgst}) and SGST (₹{ext_sgst}) must be identical for intra-state supply.",
                        expected=float(ext_cgst),
                        actual=float(ext_sgst)
                    ))
        elif supply_type == SupplyType.UNION_TERRITORY:
            if ext_igst > Decimal("0.00"):
                discrepancies.append(GSTDiscrepancy(
                    code="INCORRECT_TAX_COMPONENT_IGST_UT",
                    field="financials.igst",
                    message=(
                        f"IGST was charged on a UNION TERRITORY intra-supply "
                        f"({sup_st_name} [{sup_st_code}]). Statutory rules require CGST + UTGST."
                    ),
                    expected=0.0,
                    actual=float(ext_igst)
                ))
        elif supply_type == SupplyType.INTER_STATE:
            if ext_cgst > Decimal("0.00") or ext_sgst > Decimal("0.00"):
                discrepancies.append(GSTDiscrepancy(
                    code="INCORRECT_TAX_COMPONENT_CGST_SGST",
                    field="financials.cgst_sgst",
                    message=(
                        f"CGST/SGST (₹{ext_cgst + ext_sgst}) was charged on an INTER-STATE supply "
                        f"(Supplier: {sup_st_name} [{sup_st_code}] -> Recipient: {rec_st_name} [{rec_st_code}]). "
                        "Inter-state transactions require IGST only."
                    ),
                    expected="IGST Only",
                    actual=f"CGST: {ext_cgst}, SGST: {ext_sgst}"
                ))

        # B. Mathematical Variances with Tolerance
        taxable_diff = abs(calc_taxable - ext_taxable)
        tax_diff = abs(calc_total_tax - ext_total_tax)
        grand_diff = abs(calc_grand_total - ext_grand)

        variance = {
            "taxable_amount_diff": float(taxable_diff),
            "tax_diff": float(tax_diff),
            "grand_total_diff": float(grand_diff)
        }

        if ext_grand > Decimal("0.00") and grand_diff > tolerance:
            discrepancies.append(GSTDiscrepancy(
                code="GRAND_TOTAL_MISMATCH",
                field="financials.grand_total",
                message=(
                    f"Grand total discrepancy: Invoiced ₹{ext_grand:,.2f} differs from "
                    f"statutory calculation ₹{calc_grand_total:,.2f} by ₹{grand_diff:,.2f} (tolerance: ₹{tolerance})."
                ),
                expected=float(calc_grand_total),
                actual=float(ext_grand)
            ))

        if ext_total_tax > Decimal("0.00") and tax_diff > tolerance:
            discrepancies.append(GSTDiscrepancy(
                code="TAX_AMOUNT_MISMATCH",
                field="financials.total_tax",
                message=(
                    f"Tax calculation variance: Invoiced tax ₹{ext_total_tax:,.2f} differs from "
                    f"calculated ₹{calc_total_tax:,.2f} by ₹{tax_diff:,.2f}."
                ),
                expected=float(calc_total_tax),
                actual=float(ext_total_tax)
            ))

        # 7. Final Assessment
        has_errors = any(d.severity == "ERROR" for d in discrepancies)
        if has_errors:
            status = GSTStatus.MISMATCH
            explanation = (
                f"GST verification flagged {len(discrepancies)} discrepancy(ies). "
                f"Supply Type: {supply_type.value} ({sup_st_name} -> {rec_st_name}). "
                f"Primary Issue: {discrepancies[0].message}"
            )
            recommendation = "Hold payment and route to AP Specialist for vendor credit note or invoice revision."
            requires_human_review = True
        else:
            status = GSTStatus.PASS
            explanation = (
                f"Statutory GST verified cleanly. Supply Type: {supply_type.value} "
                f"({sup_st_name} [{sup_st_code}] -> {rec_st_name} [{rec_st_code}]). "
                f"Calculated Grand Total ₹{calc_grand_total:,.2f} aligns within ₹{tolerance} tolerance."
            )
            recommendation = "GST verified. Proceed to standard PO budget and manager approval queue."
            requires_human_review = False

        return GSTResult(
            status=status,
            supply_type=supply_type,
            supplier_state=sup_st_name,
            supplier_state_code=sup_st_code,
            recipient_state=rec_st_name,
            recipient_state_code=rec_st_code,
            is_utgst_applicable=is_utgst,
            calculated_breakdown=calculated_breakdown,
            extracted_breakdown=extracted_breakdown,
            variance=variance,
            discrepancies=discrepancies,
            line_item_results=line_item_results,
            explanation=explanation,
            recommendation=recommendation,
            requires_human_review=requires_human_review
        )

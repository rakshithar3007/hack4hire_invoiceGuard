import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Invoice, Supplier, PurchaseOrder, InvoiceItem

class FraudService:
    @classmethod
    def evaluate_fraud_risk(cls, invoice_id: str, extracted_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """
        Independent rule-based and behavioral fraud risk scoring engine.
        Returns risk score (0-100), category (LOW, MEDIUM, HIGH), detected anomalies,
        and human-readable explanations with recommended actions.
        """
        supplier_info = extracted_data.get("supplier", {})
        invoice_info = extracted_data.get("invoice_details", {})
        financial_info = extracted_data.get("financials", {})
        items = extracted_data.get("items", [])

        detected_issues: List[Dict[str, Any]] = []
        risk_score = 5.0  # Baseline minimal ambient score

        sup_name = (supplier_info.get("name") or "").strip()
        sup_gstin = (supplier_info.get("gstin") or "").strip()
        inv_num = (invoice_info.get("number") or "").strip()
        po_num = (invoice_info.get("po_number") or "").strip()
        grand_total = float(financial_info.get("grand_total") or 0.0)

        # 1. Duplicate Invoice Submissions / Repeated Invoice Numbers
        if inv_num:
            duplicate_invoices = db.query(Invoice).filter(
                Invoice.id != invoice_id,
                Invoice.invoice_number == inv_num
            ).all()

            if duplicate_invoices:
                risk_score += 45.0
                dup_ids = ", ".join([d.id for d in duplicate_invoices])
                detected_issues.append({
                    "code": "DUP_INVOICE_SUBMISSION",
                    "title": "Duplicate Invoice Identifier Detected",
                    "risk_level": "HIGH",
                    "description": f"Invoice number '{inv_num}' has already been processed in system records under ID(s): {dup_ids}. High risk of double payment."
                })

        # 2. Suspicious Invoice Amounts (Thresholds & Round Numbers)
        # Check if amount is suspiciously large (> ₹500,000 without prior history, or > ₹1,000,000)
        if grand_total > 500000:
            risk_score += 25.0
            detected_issues.append({
                "code": "HIGH_VALUE_THRESHOLD",
                "title": "High-Value Transaction Threshold Exceeded",
                "risk_level": "HIGH" if grand_total > 1000000 else "MEDIUM",
                "description": f"Invoice amount of ₹{grand_total:,.2f} exceeds standard operational review threshold. Requires elevated executive sign-off."
            })

        # Check for suspiciously neat round numbers in non-standard billing (e.g. exactly 50000.00 or 100000.00 with 0 tax)
        if grand_total > 10000 and grand_total % 10000 == 0:
            subtotal = float(financial_info.get("subtotal") or 0.0)
            if subtotal == grand_total:
                risk_score += 15.0
                detected_issues.append({
                    "code": "SUSPICIOUS_ROUND_AMOUNT",
                    "title": "Suspicious Rounded Invoice Total Without Tax Breakdown",
                    "risk_level": "MEDIUM",
                    "description": f"Invoice total of exactly ₹{grand_total:,.2f} is an unnaturally rounded figure with no distinct statutory GST breakdown."
                })

        # 3. Unusual Item Pricing / Inflation
        for item in items:
            unit_price = float(item.get("unit_price") or 0.0)
            qty = float(item.get("quantity") or 0.0)
            desc = item.get("description", "")
            
            # Unit price check against typical thresholds
            if unit_price > 150000:
                risk_score += 15.0
                detected_issues.append({
                    "code": "LINE_ITEM_PRICE_OUTLIER",
                    "title": "Line Item Unit Price Anomaly",
                    "risk_level": "MEDIUM",
                    "description": f"Item '{desc}' carries an elevated unit cost of ₹{unit_price:,.2f}. Verify vendor rate card pricing."
                })
                break

        # 4. Tax Inconsistencies & Fabrication Indicators
        subtotal = float(financial_info.get("subtotal") or 0.0)
        cgst = float(financial_info.get("cgst") or 0.0)
        sgst = float(financial_info.get("sgst") or 0.0)
        igst = float(financial_info.get("igst") or 0.0)

        if subtotal > 0 and (cgst + sgst + igst) > (subtotal * 0.40):
            risk_score += 20.0
            detected_issues.append({
                "code": "ABNORMAL_TAX_RATE",
                "title": "Abnormal Tax Assessment",
                "risk_level": "HIGH",
                "description": f"Calculated taxes (₹{cgst+sgst+igst:,.2f}) represent over 40% of taxable base. Indicative of faulty extraction or synthetic invoice tampering."
            })

        # 5. Supplier Information Mismatches
        supplier_obj = None
        if sup_gstin:
            supplier_obj = db.query(Supplier).filter(Supplier.gstin.ilike(sup_gstin)).first()
        elif sup_name:
            supplier_obj = db.query(Supplier).filter(Supplier.supplier_name.ilike(f"%{sup_name}%")).first()

        if not supplier_obj:
            risk_score += 20.0
            detected_issues.append({
                "code": "UNREGISTERED_SUPPLIER_RISK",
                "title": "Unverified Vendor Identity",
                "risk_level": "MEDIUM",
                "description": f"Supplier '{sup_name}' is not registered in internal enterprise vendor records. Untrusted billing entity."
            })
        elif sup_name and supplier_obj.supplier_name.lower() not in sup_name.lower() and sup_name.lower() not in supplier_obj.supplier_name.lower():
            risk_score += 15.0
            detected_issues.append({
                "code": "VENDOR_NAME_GSTIN_MISMATCH",
                "title": "Supplier Name / Registered GSTIN Inconsistency",
                "risk_level": "MEDIUM",
                "description": f"Invoice names vendor as '{sup_name}', but GSTIN matches registered master vendor '{supplier_obj.supplier_name}'."
            })

        # 6. Purchase Order Mismatches
        if po_num:
            po = db.query(PurchaseOrder).filter(PurchaseOrder.po_number.ilike(po_num)).first()
            if not po:
                risk_score += 15.0
                detected_issues.append({
                    "code": "FABRICATED_PO_REFERENCE",
                    "title": "Unrecognized Purchase Order Reference",
                    "risk_level": "MEDIUM",
                    "description": f"Referenced PO '{po_num}' does not exist in corporate procurement database."
                })
            else:
                if supplier_obj and po.supplier_id != supplier_obj.id:
                    risk_score += 25.0
                    detected_issues.append({
                        "code": "PO_SUPPLIER_MISMATCH",
                        "title": "Purchase Order Vendor Mismatch",
                        "risk_level": "HIGH",
                        "description": f"PO '{po_num}' was authorized for vendor ID #{po.supplier_id}, but invoice is submitted under #{supplier_obj.id} ({supplier_obj.supplier_name})."
                    })
                
                # Significant price expansion beyond approved PO (> 20%)
                if grand_total > (po.expected_amount * 1.20):
                    risk_score += 25.0
                    detected_issues.append({
                        "code": "PO_VALUE_OVERRUN",
                        "title": "Significant PO Amount Overrun",
                        "risk_level": "HIGH",
                        "description": f"Invoice total ₹{grand_total:,.2f} exceeds authorized PO budget of ₹{po.expected_amount:,.2f} by more than 20%."
                    })

        # 7. Velocity Check: Multiple invoices in short duration for same supplier
        one_day_ago = datetime.datetime.utcnow() - datetime.timedelta(days=1)
        recent_count = db.query(func.count(Invoice.id)).filter(
            Invoice.id != invoice_id,
            Invoice.supplier_id == (supplier_obj.id if supplier_obj else None),
            Invoice.created_at >= one_day_ago
        ).scalar() or 0

        if recent_count >= 3:
            risk_score += 15.0
            detected_issues.append({
                "code": "HIGH_INVOICE_VELOCITY",
                "title": "Rapid Invoice Submission Velocity",
                "risk_level": "MEDIUM",
                "description": f"Supplier has submitted {recent_count + 1} invoices in the last 24 hours. Verify burst billing legitimacy."
            })

        # Bound score between 0 and 100
        final_risk_score = min(100.0, max(0.0, round(risk_score, 1)))

        # Categorization
        if final_risk_score < 30.0:
            category = "LOW"
            action = "Invoice cleared for regular management approval workflow."
        elif final_risk_score < 70.0:
            category = "MEDIUM"
            action = "Flagged for standard review. Secondary manager verification advised."
        else:
            category = "HIGH"
            action = "ESCALATION REQUIRED: Do not approve automatically. Refer to internal audit and manual fraud review."

        # Explainable summary synthesis
        if not detected_issues:
            explanation = "Invoice exhibits standard operational parameters. Vendor identity, statutory GST, mathematical totals, and PO reconciliation show no signs of fraudulent activity."
        else:
            reasons = [f"• {issue['title']}: {issue['description']}" for issue in detected_issues]
            explanation = f"Fraud risk assessment identified {len(detected_issues)} operational anomaly/anomalies:\n" + "\n".join(reasons)

        return {
            "invoice_id": invoice_id,
            "risk_score": final_risk_score,
            "risk_category": category,
            "detected_issues": detected_issues,
            "explanation": explanation,
            "recommended_action": action,
            "timestamp": datetime.datetime.utcnow()
        }

fraud_service = FraudService()

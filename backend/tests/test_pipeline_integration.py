import pytest
from app.database.session import SessionLocal
from app.models.models import Invoice, User
from app.services.validation_service import validation_service
from app.services.fraud_service import fraud_service
from app.services.gst import gst_calculation_node


class TestPipelineRegression:
    """
    Integration regression test verifying that existing invoice verification,
    validation rules, fraud risk scoring, and snapshot generation work harmoniously
    with the new GST calculation agent.
    """

    def test_pipeline_integration_clean_invoice(self):
        db = SessionLocal()
        try:
            extracted_data = {
                "supplier": {
                    "name": "ABC Technologies Pvt Ltd",
                    "gstin": "29ABCDE1234F1Z5"
                },
                "invoice_details": {
                    "number": "INV-2026-GST-REG-01",
                    "date": "2026-10-30",
                    "due_date": "2026-11-29",
                    "po_number": "PO-2026-8801"
                },
                "items": [
                    {
                        "description": "Cloud Architecture Consulting",
                        "quantity": 1.0,
                        "unit_price": 21186.44,
                        "tax_rate": 0.18,
                        "tax": 3813.56,
                        "total": 21186.44
                    }
                ],
                "financials": {
                    "subtotal": 21186.44,
                    "cgst": 1906.78,
                    "sgst": 1906.78,
                    "igst": 0.0,
                    "grand_total": 25000.00
                },
                "overall_confidence": 98.0
            }

            # 1. Run GST Node
            state = {
                "invoice_id": "INV-REG-TEST-01",
                "extracted_data": extracted_data,
                "confidence_scores": {"supplier_gstin": 98.0, "grand_total": 98.0},
                "overall_confidence": 98.0
            }
            state = gst_calculation_node(state)
            assert "gst_result" in state
            assert state["gst_result"]["status"] == "PASS"

            # 2. Run Validation Service with gst_result
            val_res = validation_service.validate_invoice(
                invoice_id="INV-REG-TEST-01",
                extracted_data=extracted_data,
                db=db,
                gst_result=state["gst_result"]
            )

            # Check that validation executed with all rules
            rule_ids = [r["rule_id"] for r in val_res["validation_details"]]
            assert "GST_INDEPENDENT_AUDIT" in rule_ids
            assert "GSTIN_CHECK" in rule_ids
            assert "AMOUNT_CHECK" in rule_ids
            assert "TAX_CHECK" in rule_ids
            assert val_res["validation_status"] == "PASSED"

            # 3. Run Fraud Risk Service
            fraud_res = fraud_service.evaluate_fraud_risk(
                invoice_id="INV-REG-TEST-01",
                extracted_data=extracted_data,
                db=db
            )
            assert fraud_res["risk_category"] in ("LOW", "MEDIUM", "HIGH")
            assert 0 <= fraud_res["risk_score"] <= 100

        finally:
            db.close()

    def test_pipeline_integration_mismatch_invoice(self):
        db = SessionLocal()
        try:
            # Invoice with deliberate GST discrepancy (charging IGST on intra-state)
            extracted_data = {
                "supplier": {
                    "name": "Karnataka Vendor Misconfigured",
                    "gstin": "29ABCDE1234F1Z5"
                },
                "invoice_details": {
                    "number": "INV-2026-GST-REG-02",
                    "date": "2026-10-30",
                    "po_number": "PO-2026-8801"
                },
                "items": [
                    {
                        "description": "Consulting",
                        "quantity": 1.0,
                        "unit_price": 50000.0,
                        "tax_rate": 0.18,
                        "total": 50000.0
                    }
                ],
                "financials": {
                    "subtotal": 50000.0,
                    "cgst": 0.0,
                    "sgst": 0.0,
                    "igst": 9000.0,  # Invalid IGST for intra-state
                    "grand_total": 59000.0
                },
                "overall_confidence": 95.0
            }

            state = {
                "invoice_id": "INV-REG-TEST-02",
                "extracted_data": extracted_data,
                "confidence_scores": {"supplier_gstin": 95.0},
                "overall_confidence": 95.0
            }
            state = gst_calculation_node(state)
            assert state["gst_result"]["status"] == "MISMATCH"

            val_res = validation_service.validate_invoice(
                invoice_id="INV-REG-TEST-02",
                extracted_data=extracted_data,
                db=db,
                gst_result=state["gst_result"]
            )

            # GST_INDEPENDENT_AUDIT must catch the mismatch and fail validation
            gst_rule = next(r for r in val_res["validation_details"] if r["rule_id"] == "GST_INDEPENDENT_AUDIT")
            assert gst_rule["status"] == "FAIL"
            assert val_res["validation_status"] == "FAILED"

        finally:
            db.close()

import pytest
from app.services.gst.agent import GSTCalculationAgent, gst_calculation_node
from app.services.gst.schemas import GSTStatus
import app.services.gst.agent as agent_module


class TestGSTCalculationAgent:
    """
    Unit test suite for the LangGraph integration node.
    Verifies error isolation, disabled behavior, low OCR confidence handling,
    and state immutability safeguards.
    """

    def test_successful_state_execution(self):
        state = {
            "invoice_id": "INV-TEST-01",
            "extracted_data": {
                "supplier": {
                    "name": "Cloud Providers Karnataka",
                    "gstin": "29ABCDE1234F1Z5"
                },
                "financials": {
                    "subtotal": 10000.0,
                    "cgst": 900.0,
                    "sgst": 900.0,
                    "igst": 0.0,
                    "grand_total": 11800.0
                },
                "items": [
                    {
                        "description": "Server Hosting",
                        "quantity": 1.0,
                        "unit_price": 10000.0,
                        "tax_rate": 0.18,
                        "total": 10000.0
                    }
                ]
            },
            "confidence_scores": {
                "supplier_gstin": 98.0,
                "grand_total": 95.0
            },
            "recipient_gstin": "29XYZAB5678C1Z2"
        }

        updated_state = gst_calculation_node(state)

        assert "gst_result" in updated_state
        res = updated_state["gst_result"]
        assert res["status"] == "PASS"
        assert res["supply_type"] == "INTRA_STATE"
        assert res["requires_human_review"] is False
        # Assert state fields were not corrupted
        assert updated_state["invoice_id"] == "INV-TEST-01"

    def test_disabled_agent_pass_through(self, monkeypatch):
        # Disable agent via module flag
        monkeypatch.setattr(agent_module, "GST_AGENT_ENABLED", False)

        state = {
            "invoice_id": "INV-TEST-DISABLED",
            "extracted_data": {
                "supplier": {"gstin": "29ABCDE1234F1Z5"}
            }
        }

        updated_state = gst_calculation_node(state)
        assert "gst_result" in updated_state
        assert updated_state["gst_result"]["status"] == "DISABLED"
        assert updated_state["gst_result"]["requires_human_review"] is False

    def test_low_ocr_confidence_handling(self):
        # Low confidence on GSTIN (< 50%)
        state = {
            "invoice_id": "INV-TEST-LOW-CONF",
            "extracted_data": {
                "supplier": {
                    "name": "Smudged Vendor",
                    "gstin": "29ABCDE1234F1Z5"
                },
                "financials": {
                    "subtotal": 1000.0,
                    "grand_total": 1180.0
                }
            },
            "confidence_scores": {
                "supplier_gstin": 35.0  # Low confidence!
            }
        }

        updated_state = gst_calculation_node(state)
        assert "gst_result" in updated_state
        res = updated_state["gst_result"]
        assert res["status"] == "INSUFFICIENT_DATA"
        assert res["requires_human_review"] is True
        assert "confidence" in res["explanation"].lower()

    def test_empty_or_malformed_state_isolation(self):
        # Must never raise an unhandled exception even if state is totally malformed
        malformed_states = [
            {},
            {"extracted_data": None},
            {"extracted_data": "invalid string"},
            {"extracted_data": {"supplier": None, "financials": None}}
        ]

        for s in malformed_states:
            out = gst_calculation_node(s)
            assert "gst_result" in out
            assert out["gst_result"]["status"] in ("INSUFFICIENT_DATA", "MISMATCH")
            assert out["gst_result"]["requires_human_review"] is True

    def test_mismatch_routes_to_human_review_never_auto_approves(self):
        # Invoiced amounts do not match GST rate
        state = {
            "invoice_id": "INV-TEST-MISMATCH",
            "extracted_data": {
                "supplier": {
                    "name": "Vendor A",
                    "gstin": "29ABCDE1234F1Z5"
                },
                "financials": {
                    "subtotal": 1000.0,
                    "cgst": 500.0,  # 50% tax instead of 9%
                    "sgst": 500.0,
                    "igst": 0.0,
                    "grand_total": 2000.0
                },
                "items": [
                    {
                        "description": "Item",
                        "quantity": 1.0,
                        "unit_price": 1000.0,
                        "tax_rate": 0.18,
                        "total": 1000.0
                    }
                ]
            },
            "confidence_scores": {
                "supplier_gstin": 95.0
            },
            "recipient_gstin": "29XYZAB5678C1Z2"
        }

        updated_state = gst_calculation_node(state)
        res = updated_state["gst_result"]
        assert res["status"] == "MISMATCH"
        assert res["requires_human_review"] is True
        # Safety guarantee: Never sets approval_status to APPROVED
        assert updated_state.get("approval_status") != "APPROVED"

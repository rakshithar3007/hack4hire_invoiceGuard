import logging
from typing import Dict, Any, Optional

from app.services.gst.config import GST_AGENT_ENABLED, DEFAULT_GST_TOLERANCE_INR
from app.services.gst.schemas import GSTStatus, GSTResult, SupplyType, TaxBreakdown
from app.services.gst.calculator import GSTCalculator

logger = logging.getLogger("invoiceguard.gst_agent")

class GSTCalculationAgent:
    """
    Thin LangGraph & pipeline integration node.
    Acts as a non-breaking wrapper around the pure deterministic GSTCalculator.
    Safely handles disabled states, low confidence, and malformed payloads without crashing.
    """

    @classmethod
    def execute(cls, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Node execution function.
        Receives workflow state, computes gst_result, and injects it into state.
        Guaranteed to never raise unhandled exceptions.
        """
        # 1. Feature Flag Guard
        if not GST_AGENT_ENABLED:
            logger.info("[GST Agent] Feature flag disabled; passing through state cleanly.")
            disabled_result = GSTResult(
                status=GSTStatus.DISABLED,
                supply_type=SupplyType.UNSUPPORTED,
                calculated_breakdown=TaxBreakdown(),
                discrepancies=[],
                explanation="GST calculation agent is disabled via configuration.",
                recommendation="Proceed with standard verification rules.",
                requires_human_review=False
            )
            state["gst_result"] = disabled_result.model_dump()
            return state

        try:
            extracted_data = state.get("extracted_data")
            if not extracted_data or not isinstance(extracted_data, dict):
                logger.warning("[GST Agent] State missing valid extracted_data object.")
                insufficient_res = GSTResult(
                    status=GSTStatus.INSUFFICIENT_DATA,
                    supply_type=SupplyType.UNSUPPORTED,
                    calculated_breakdown=TaxBreakdown(),
                    discrepancies=[],
                    explanation="Missing or unparseable extracted invoice data.",
                    recommendation="Trigger document re-extraction or manual operator review.",
                    requires_human_review=True
                )
                state["gst_result"] = insufficient_res.model_dump()
                return state

            # 2. Confidence Check
            confidence_scores = state.get("confidence_scores", {})
            gstin_conf = confidence_scores.get("supplier_gstin", 100.0)
            overall_conf = state.get("overall_confidence") or extracted_data.get("overall_confidence", 100.0)

            # If GSTIN confidence is dangerously low (< 50%), treat as insufficient data rather than false mismatch
            if gstin_conf < 50.0:
                logger.info(f"[GST Agent] Low GSTIN confidence ({gstin_conf}%); returning INSUFFICIENT_DATA.")
                insufficient_res = GSTResult(
                    status=GSTStatus.INSUFFICIENT_DATA,
                    supply_type=SupplyType.UNSUPPORTED,
                    calculated_breakdown=TaxBreakdown(),
                    discrepancies=[],
                    explanation=f"OCR extraction confidence on Supplier GSTIN is low ({gstin_conf:.1f}%).",
                    recommendation="Review original scanned invoice document in split-pane view.",
                    requires_human_review=True
                )
                state["gst_result"] = insufficient_res.model_dump()
                return state

            # 3. Deterministic Verification Execution
            result = GSTCalculator.verify_invoice_gst(
                extracted_data=extracted_data,
                tolerance=DEFAULT_GST_TOLERANCE_INR,
                recipient_gstin=state.get("recipient_gstin"),
                place_of_supply_code=state.get("place_of_supply_code")
            )

            # 4. Attach gst_result to state
            state["gst_result"] = result.model_dump()
            logger.info(f"[GST Agent] Completed verification: Status={result.status.value}, SupplyType={result.supply_type.value}")

        except Exception as e:
            logger.error(f"[GST Agent] Unexpected exception caught in GST calculation node: {e}", exc_info=True)
            # Safe fail-open response: never crash the parent pipeline
            safe_fallback = GSTResult(
                status=GSTStatus.INSUFFICIENT_DATA,
                supply_type=SupplyType.UNSUPPORTED,
                calculated_breakdown=TaxBreakdown(),
                discrepancies=[],
                explanation=f"GST agent encountered an internal processing anomaly: {str(e)}",
                recommendation="Manual AP verification required.",
                requires_human_review=True
            )
            state["gst_result"] = safe_fallback.model_dump()

        return state

# LangGraph functional node alias
gst_calculation_node = GSTCalculationAgent.execute

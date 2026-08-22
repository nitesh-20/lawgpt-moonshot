import json
import re
import httpx
from typing import Any
from loguru import logger
from app.core.config import settings


class RiskDetector:
    """
    Detects, classifies, and explains risks in a legal document.
    Classifies risks as Critical, High, Medium, or Low.
    Uses Gemini LLM when configured, otherwise falls back to deterministic parsing.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def detect(self, text: str) -> dict[str, Any]:
        """
        Analyze text to detect risks and assign levels.
        """
        default_res = {
            "risks": [],
            "compliance_flags": []
        }

        if not text:
            return default_res

        if self.api_key and "your-gemini-api-key" not in self.api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}
                
                system_instruction = (
                    "You are an expert Legal Risk Auditor. Analyze the provided legal document and identify risks "
                    "or highly unfavorable clauses for a party.\n"
                    "For each risk, provide:\n"
                    "- 'clause': The clause text or type containing the risk.\n"
                    "- 'level': One of 'Critical', 'High', 'Medium', 'Low'.\n"
                    "- 'reason': Why this is a risk.\n"
                    "- 'impact': The potential legal/financial impact on the company.\n"
                    "- 'recommendation': Specific wording changes or actions to mitigate the risk.\n"
                    "Also, identify any regulatory or compliance issues and place them in the 'compliance_flags' list.\n"
                    "You MUST respond ONLY with a valid JSON object containing the keys: "
                    "'risks' (array of objects with keys: 'clause', 'level', 'reason', 'impact', 'recommendation') and "
                    "'compliance_flags' (array of strings explaining compliance issues)."
                )
                
                prompt = f"Document Text:\n{text[:40000]}\n\nAnalyze risks in JSON format."
                
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.1
                    }
                }

                logger.info("Calling Gemini API for Risk Detection...")
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, headers=headers, timeout=20.0)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(raw_text.strip())
                        return {
                            "risks": parsed.get("risks", []),
                            "compliance_flags": parsed.get("compliance_flags", [])
                        }
                    else:
                        logger.warning(f"Gemini API returned status {resp.status_code}. Falling back to rule-based risk detection.")
            except Exception as e:
                logger.error(f"Error calling Gemini API for risks: {e}. Falling back to rule-based risk detection.")

        return self._local_fallback(text)

    def _local_fallback(self, text: str) -> dict[str, Any]:
        logger.info("Executing local fallback for RiskDetector...")
        
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        detected_risks = []
        compliance_flags = []

        risk_rules = [
            {
                "category": "Unlimited Liability",
                "regex": r"\bunlimited\s+liability\b|\bliable\s+without\s+limit\b|\bno\s+cap\s+on\s+liability\b",
                "level": "Critical",
                "reason": "Exposes the company to unlimited financial damages in case of a breach.",
                "impact": "Potentially catastrophic financial and legal exposure exceeding the value of the contract.",
                "recommendation": "Insert a liability cap clause limiting liability to a multiple of fees paid (e.g., 1x or 2x fees in the last 12 months)."
            },
            {
                "category": "Unilateral Termination",
                "regex": r"\bterminate\s+at\s+any\s+time\s+without\s+cause\s+by\s+(?:other\s+party|Licensor|Customer|Disclosing\s+Party)\b|\bterminate\s+for\s+convenience\s+without\s+notice\b",
                "level": "High",
                "reason": "Allows the counterparty to cancel the agreement abruptly without penalty or explanation.",
                "impact": "Operational disruption, loss of service, and sunk costs without recourse.",
                "recommendation": "Negotiate a bilateral termination for convenience clause with at least a 30-day or 60-day written notice requirement."
            },
            {
                "category": "Broad Intellectual Property Assignment",
                "regex": r"\ball\s+(?:intellectual\s+property|IP)\s+shall\s+(?:vest\s+in|be\s+assigned\s+to|belong\s+to)\s+(?:the\s+other\s+party|Client|Customer|Licensor)\b",
                "level": "High",
                "reason": "Requires transferring ownership of proprietary IP or background technology to the counterparty.",
                "impact": "Loss of ownership of core assets, preventing future reuse or licensing.",
                "recommendation": "Carve out 'Background IP' and explicitly state that only custom deliverables created specifically for the client are assigned, subject to full payment."
            },
            {
                "category": "Unfavorable Indemnity",
                "regex": r"\bindemnify\s+and\s+hold\s+harmless\s+from\s+any\s+and\s+all\s+claims\b|\bsolely\s+responsible\s+for\s+all\s+losses\b",
                "level": "Medium",
                "reason": "Binds the company to compensate the other party for third-party claims without reciprocal protection.",
                "impact": "Significant cost of defending lawsuits and paying settlements for events outside direct control.",
                "recommendation": "Request a mutual indemnification clause limited to direct losses caused by gross negligence or willful misconduct."
            },
            {
                "category": "Heavy Liquidated Damages / Penalties",
                "regex": r"\bliquidated\s+damages\b|\bpenalty\s+of\s+(?:Rs\.?|INR|\$)\b|\bforfeit\s+all\s+payments\b",
                "level": "Medium",
                "reason": "Imposes predetermined severe financial penalties for minor delays or errors.",
                "impact": "Automatic deduction of fees or direct financial outbound charges.",
                "recommendation": "Replace liquidated damages with actual proven damages capped at a reasonable threshold."
            },
            {
                "category": "Automatic Renewal / Opt-Out",
                "regex": r"\bautomatically\s+renew\b|\bauto-renew\b|\brenewal\s+unless\s+written\s+notice\b",
                "level": "Low",
                "reason": "Renews the contract and payment obligations automatically unless a formal cancellation notice is sent.",
                "impact": "Unintended recurring financial commitments and contract locking.",
                "recommendation": "Modify the renewal clause to require active, written mutual consent for any extension."
            }
        ]

        for para in paragraphs:
            for rule in risk_rules:
                if re.search(rule["regex"], para, re.IGNORECASE):
                    # Dedup similar risk categories
                    if not any(r["clause"] == rule["category"] for r in detected_risks):
                        detected_risks.append({
                            "clause": rule["category"],
                            "level": rule["level"],
                            "reason": rule["reason"],
                            "impact": rule["impact"],
                            "recommendation": rule["recommendation"]
                        })
                        
                        # Add a compliance flag if it is critical or high risk
                        if rule["level"] in ["Critical", "High"]:
                            compliance_flags.append(f"Ensure board or executive team approval is obtained for {rule['category'].lower()} provisions.")

        # Default compliance checks
        if not any(kw in text.lower() for kw in ["governing law", "jurisdiction"]):
            compliance_flags.append("Missing Governing Law and Jurisdiction clause which represents a compliance risk.")
        if "dispute resolution" not in text.lower() and "arbitration" not in text.lower():
            compliance_flags.append("Missing dispute resolution mechanism flags. Recommending adding an Arbitration clause.")

        return {
            "risks": detected_risks,
            "compliance_flags": list(set(compliance_flags))
        }

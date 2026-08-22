import json
import re
import httpx
from typing import Any, Dict, List
from loguru import logger
from app.core.config import settings
from app.agents.drafting_agent.clauses import ClauseLibrary


class DraftGenerator:
    """
    Generates legal document drafts by merging templates, clauses, and variable replacements.
    Uses Gemini API when configured, otherwise falls back to a rule-based formatting engine.
    """
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.library = ClauseLibrary()

    async def generate(
        self,
        template: Dict[str, Any],
        variables: Dict[str, Any],
        selected_clauses: Dict[str, Dict[str, str]],
        user_instructions: str = ""
    ) -> Dict[str, Any]:
        """
        Generates the document. Attempts to use Gemini for premium quality,
        falling back to local templating otherwise.
        """
        # Prepare local draft text as fallback and as base input for LLM
        local_draft = self._local_generation(template, variables, selected_clauses)
        
        # Prepare standard structure
        default_res = {
            "executive_summary": f"Standard draft of {template.get('name')}.",
            "generated_draft": local_draft,
            "clause_explanations": {k: v["explanation"] for k, v in selected_clauses.items()},
            "risk_assessment": [],
            "compliance_notes": "Local draft generated using standard boilerplate. Please perform compliance validation.",
            "recommended_improvements": [],
            "confidence_score": 0.8
        }

        if self.api_key and "your-gemini-api-key" not in self.api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}

                system_instruction = (
                    "You are an Elite Legal Drafter. Generate a professional, binding, and fully customized "
                    "legal document based on the provided variables, selected clauses, and user guidelines.\n"
                    "Your response must be returned in a strict JSON format with the following keys:\n"
                    "- 'executive_summary': A brief description of the generated document.\n"
                    "- 'generated_draft': The complete, beautifully structured and formatted Markdown legal contract. "
                    "Make sure all variables are fully integrated and do NOT leave unresolved placeholders.\n"
                    "- 'clause_explanations': A dict mapping clause keys (like 'confidentiality', 'termination') "
                    "to a plain-English explanation of what that specific clause means and its legal consequences.\n"
                    "- 'risk_assessment': A list of objects with keys: 'clause', 'level' ('Critical', 'High', 'Medium', 'Low'), "
                    "'reason', and 'recommendation'. These are potential risks in the draft (e.g. indemnity imbalance).\n"
                    "- 'compliance_notes': Verification statements regarding compliance with relevant acts (e.g., DPDP Act, GST, SEBI).\n"
                    "- 'recommended_improvements': List of suggestions to improve the draft further.\n"
                    "- 'confidence_score': A float from 0.0 to 1.0 representing your confidence in this draft's quality."
                )

                prompt = (
                    f"Template Name: {template.get('name')}\n"
                    f"Required Variables & Provided Values: {json.dumps(variables, indent=2)}\n"
                    f"Selected Clauses text: {json.dumps({k: v['text'] for k, v in selected_clauses.items()}, indent=2)}\n"
                    f"Draft Base Version:\n{local_draft}\n\n"
                    f"User Custom Instructions: {user_instructions}\n\n"
                    "Generate the completed legal contract in the requested JSON structure."
                )

                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.2
                    }
                }

                logger.info(f"Calling Gemini API to generate legal contract: {template.get('name')}...")
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, headers=headers, timeout=30.0)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(raw_text.strip())
                        logger.info("Successfully received and parsed Gemini generated contract.")
                        return {
                            "executive_summary": parsed.get("executive_summary", default_res["executive_summary"]),
                            "generated_draft": parsed.get("generated_draft", default_res["generated_draft"]),
                            "clause_explanations": parsed.get("clause_explanations", default_res["clause_explanations"]),
                            "risk_assessment": parsed.get("risk_assessment", []),
                            "compliance_notes": parsed.get("compliance_notes", default_res["compliance_notes"]),
                            "recommended_improvements": parsed.get("recommended_improvements", []),
                            "confidence_score": float(parsed.get("confidence_score", 0.9))
                        }
                    else:
                        logger.warning(f"Gemini API returned status {resp.status_code}. Falling back to local generation.")
            except Exception as e:
                logger.error(f"Error calling Gemini API for draft generation: {e}. Falling back to local generation.")

        # Local fallback execution
        return default_res

    def _local_generation(
        self,
        template: Dict[str, Any],
        variables: Dict[str, Any],
        selected_clauses: Dict[str, Dict[str, str]]
    ) -> str:
        """
        Locally formats and replaces templates and clauses using regular expression lookups.
        """
        logger.info("Running local rendering engine for draft generation...")
        boilerplate = template.get("boilerplate", "")
        
        # 1. Substitute clauses
        draft_text = boilerplate
        for clause_id, details in selected_clauses.items():
            placeholder = f"{{{{{clause_id}}}}}"
            draft_text = draft_text.replace(placeholder, details["text"])

        # 2. Substitute variables
        for var_name, var_value in variables.items():
            placeholder = f"{{{{{var_name}}}}}"
            draft_text = draft_text.replace(placeholder, str(var_value))

        # 3. Clean up any remaining double brackets/placeholders
        draft_text = re.sub(r"\{\{[a-zA-Z0-9_-]+\}\}", "[TBD]", draft_text)
        return draft_text

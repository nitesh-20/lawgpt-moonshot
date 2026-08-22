import json
import re
import httpx
from typing import Any
from loguru import logger
from app.core.config import settings


class ObligationExtractor:
    """
    Extracts party-wise obligations, deadlines, and parameters from a legal document.
    Uses Gemini LLM when configured, otherwise falls back to deterministic parsing.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def extract(self, text: str) -> list[dict[str, Any]]:
        """
        Extract obligations from text.
        """
        if not text:
            return []

        if self.api_key and "your-gemini-api-key" not in self.api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}
                
                system_instruction = (
                    "You are a Senior Legal Counsel. You must analyze the provided legal document "
                    "and extract a list of all explicit legal obligations.\n"
                    "For each obligation, specify:\n"
                    "- 'obligor': The party responsible for performing the obligation (e.g., 'Licensor', 'Licensee', 'Customer', 'Service Provider').\n"
                    "- 'description': What the obligor is required to do.\n"
                    "- 'deadline': Any timeline or deadline associated (e.g., 'within 30 days', 'upon termination', 'N/A').\n"
                    "- 'penalty': Any penalty or consequence for failure to perform, if specified (e.g., 'interest on late fees', 'right to terminate', 'None').\n"
                    "You MUST respond ONLY with a valid JSON array of objects containing these keys: "
                    "'obligor', 'description', 'deadline', 'penalty'."
                )
                
                prompt = f"Document Text:\n{text[:40000]}\n\nExtract obligations in JSON format."
                
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.1
                    }
                }

                logger.info("Calling Gemini API for Obligation Extraction...")
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, headers=headers, timeout=20.0)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                        # Sometimes LLM responds with a dictionary wrapping the array
                        parsed = json.loads(raw_text.strip())
                        if isinstance(parsed, dict) and "obligations" in parsed:
                            return parsed["obligations"]
                        elif isinstance(parsed, list):
                            return parsed
                        return []
                    else:
                        logger.warning(f"Gemini API returned status {resp.status_code}. Falling back to rule-based obligation extraction.")
            except Exception as e:
                logger.error(f"Error calling Gemini API for obligations: {e}. Falling back to rule-based obligation extraction.")

        return self._local_fallback(text)

    def _local_fallback(self, text: str) -> list[dict[str, Any]]:
        logger.info("Executing local fallback for ObligationExtractor...")
        
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        obligations = []

        # List of potential obligors in legal documents
        obligors_list = [
            "Licensor", "Licensee", "Customer", "Client", "Service Provider", 
            "Vendor", "Company", "Disclosing Party", "Receiving Party", "Employer", "Employee"
        ]

        obligation_verbs = [
            r"\bshall\b", r"\bmust\b", r"\bagrees\s+to\b", r"\bundertakes\s+to\b", 
            r"\bis\s+responsible\s+for\b", r"\bis\s+obligated\s+to\b"
        ]
        verb_pattern = "|".join(obligation_verbs)

        for para in paragraphs:
            # Check if paragraph contains any obligation indicator
            if re.search(verb_pattern, para, re.IGNORECASE):
                # Attempt to detect obligor
                detected_obligor = "Party"
                for o in obligors_list:
                    if re.search(rf"\b{o}\b", para, re.IGNORECASE):
                        detected_obligor = o
                        break
                
                # Check for deadlines (e.g. "within X days", "by Y", "promptly")
                deadline_match = re.search(r'\b(within\s+\d+\s+(?:days|months|weeks|business\s+days)|promptly|upon\s+[a-zA-Z\s]+|prior\s+to\s+[a-zA-Z\s]+)\b', para, re.IGNORECASE)
                deadline = deadline_match.group(1) if deadline_match else "N/A"

                # Check for penalties (e.g. late fee, terminate, interest)
                penalty_match = re.search(r'\b(late\s+fee|interest\s+of\s+\d+|right\s+to\s+terminate|penalty\s+of|liquidated\s+damages)\b', para, re.IGNORECASE)
                penalty = penalty_match.group(1) if penalty_match else "None"

                # Limit character length of the description snippet
                desc = para[:250] + "..." if len(para) > 250 else para
                
                obligations.append({
                    "obligor": detected_obligor,
                    "description": desc,
                    "deadline": deadline,
                    "penalty": penalty
                })
                
                if len(obligations) >= 10: # Limit count to keep it concise
                    break

        return obligations

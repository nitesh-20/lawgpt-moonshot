import json
import re
import httpx
from typing import Any
from loguru import logger
from app.core.config import settings


class ClauseExtractor:
    """
    Extracts key legal clauses (arbitration, indemnity, termination, confidentiality, etc.)
    and detects missing standard clauses.
    Uses Gemini LLM when configured, otherwise falls back to deterministic regex-based parsing.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def extract(self, text: str) -> dict[str, Any]:
        """
        Extract clauses and identify missing ones.
        """
        if not text:
            return {
                "clauses": [],
                "missing_clauses": []
            }

        if self.api_key and "your-gemini-api-key" not in self.api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}
                
                system_instruction = (
                    "You are a Senior Legal Counsel. You must analyze the provided legal document "
                    "and extract key clauses: 'Rights', 'Obligations', 'Payment Terms', 'Termination Clauses', "
                    "'Confidentiality Clauses', 'Arbitration Clauses', 'Renewal Terms', 'Penalty Clauses'.\n"
                    "For each extracted clause, provide: 'type' (the category name), 'clause_text' (the exact text snippet or paragraph), "
                    "and a short 'summary' explanation.\n"
                    "Also, identify if any of the following standard clauses are 'missing' from the document: "
                    "'Indemnity', 'Severability', 'Governing Law', 'Force Majeure'.\n"
                    "You MUST respond ONLY with a valid JSON object containing the keys: "
                    "'clauses' (array of objects with keys: 'type', 'clause_text', 'summary') and "
                    "'missing_clauses' (array of strings of missing clause names)."
                )
                
                prompt = f"Document Text:\n{text[:40000]}\n\nExtract clauses in JSON format."
                
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.1
                    }
                }

                logger.info("Calling Gemini API for Clause Extraction...")
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, headers=headers, timeout=20.0)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(raw_text.strip())
                        return {
                            "clauses": parsed.get("clauses", []),
                            "missing_clauses": parsed.get("missing_clauses", [])
                        }
                    else:
                        logger.warning(f"Gemini API returned status {resp.status_code}. Falling back to rule-based clause extraction.")
            except Exception as e:
                logger.error(f"Error calling Gemini API for clauses: {e}. Falling back to rule-based clause extraction.")

        return self._local_fallback(text)

    def _local_fallback(self, text: str) -> dict[str, Any]:
        logger.info("Executing local fallback for ClauseExtractor...")
        
        # Split text into paragraphs
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        
        extracted_clauses = []
        clause_keywords = {
            "Payment Terms": [r"\bpay\b", r"\bpayment\b", r"\bfees\b", r"\binvoice\b", r"\bprice\b", r"\bamount\b"],
            "Termination Clauses": [r"\bterminat", r"\bexpiry\b", r"\bcancel\b"],
            "Confidentiality Clauses": [r"\bconfidential", r"\bdisclosure\b", r"\bnon-disclosure\b", r"\bsecrecy\b"],
            "Arbitration Clauses": [r"\barbitrat", r"\bdispute resolution\b", r"\bmediate\b"],
            "Renewal Terms": [r"\brenew", r"\bextension\b", r"\bprolong\b"],
            "Penalty Clauses": [r"\bpenal", r"\bfine\b", r"\bliquidated damages\b", r"\bremedy\b"],
            "Rights": [r"\brights?\b", r"\bentitled\b", r"\blicense\b"],
            "Obligations": [r"\bobligat", r"\bshall\b", r"\bmust\b", r"\bagrees to\b"]
        }

        # Keep track of found clause categories
        found_categories = set()

        for para in paragraphs:
            for category, regexes in clause_keywords.items():
                if any(re.search(rx, para, re.IGNORECASE) for rx in regexes):
                    # To avoid marking every single paragraph as Rights/Obligations, limit duplicates
                    if category in ["Rights", "Obligations"] and len([c for c in extracted_clauses if c["type"] == category]) >= 3:
                        continue
                    
                    if len(para) < 300: # Ensure we capture complete/meaningful text block
                        # Combine with adjacent paragraph if too short
                        idx = paragraphs.index(para)
                        snippet = para
                        if idx < len(paragraphs) - 1:
                            snippet += "\n\n" + paragraphs[idx + 1]
                    else:
                        snippet = para

                    extracted_clauses.append({
                        "type": category,
                        "clause_text": snippet[:1000],
                        "summary": f"Provisions regarding {category.lower()} in the document."
                    })
                    found_categories.add(category)
                    break # Assign each paragraph to at most one category to avoid huge duplicates

        # Standard legal clauses to check if missing
        standard_clauses = {
            "Indemnity": [r"\bindemnity\b", r"\bindemnif", r"\bhold harmless\b"],
            "Severability": [r"\bseverab", r"\binvalid\b", r"\bunenforceable\b"],
            "Governing Law": [r"\bgoverning law\b", r"\bjurisdiction\b", r"\bapplicable law\b"],
            "Force Majeure": [r"\bforce majeure\b", r"\bact of god\b", r"\bunforeseen\b"]
        }

        missing_clauses = []
        for name, regexes in standard_clauses.items():
            if not any(re.search(rx, text, re.IGNORECASE) for rx in regexes):
                missing_clauses.append(name)

        return {
            "clauses": extracted_clauses,
            "missing_clauses": missing_clauses
        }

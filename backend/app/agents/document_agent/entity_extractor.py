import json
import re
import httpx
from typing import Any
from loguru import logger
from app.core.config import settings


class EntityExtractor:
    """
    Extracts key legal entities (People, Companies, Addresses, Money, Dates, Acts, Sections, Courts, Signatories, etc.)
    Uses Gemini LLM when configured, otherwise falls back to deterministic regex-based parsing.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def extract(self, text: str) -> dict[str, list[str]]:
        """
        Extract entities from text and return categorized lists.
        """
        default_entities = {
            "people": [],
            "companies": [],
            "addresses": [],
            "dates": [],
            "money": [],
            "percentages": [],
            "acts": [],
            "sections": [],
            "courts": [],
            "authorities": [],
            "signatories": []
        }

        if not text:
            return default_entities

        if self.api_key and "your-gemini-api-key" not in self.api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}
                
                system_instruction = (
                    "You are a Senior Legal Counsel. You must analyze the provided legal document "
                    "and extract lists of specific entities:\n"
                    "- 'people': individuals mentioned.\n"
                    "- 'companies': corporate entities, organizations, partners.\n"
                    "- 'addresses': geographic or mailing locations.\n"
                    "- 'dates': specific dates mentioned.\n"
                    "- 'money': financial values and currency amounts.\n"
                    "- 'percentages': interest rates, proportions, stakes.\n"
                    "- 'acts': statutes, legislations, laws referenced (e.g., Companies Act 2013).\n"
                    "- 'sections': section references (e.g., Section 138).\n"
                    "- 'courts': legal forums, benches (e.g., Supreme Court of India).\n"
                    "- 'authorities': governmental or regulatory bodies.\n"
                    "- 'signatories': individuals executing/signing the agreement.\n"
                    "You MUST respond ONLY with a valid JSON object containing these keys as arrays of strings. "
                    "If an entity type is not found, return an empty array for that key."
                )
                
                prompt = f"Document Text:\n{text[:40000]}\n\nExtract entities in JSON format."
                
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.1
                    }
                }

                logger.info("Calling Gemini API for Entity Extraction...")
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, headers=headers, timeout=20.0)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(raw_text.strip())
                        
                        # Merge with default to guarantee all keys exist
                        result = dict(default_entities)
                        for k, v in parsed.items():
                            if k in result and isinstance(v, list):
                                result[k] = [str(item).strip() for item in v if item]
                        return result
                    else:
                        logger.warning(f"Gemini API returned status {resp.status_code}. Falling back to rule-based entity extraction.")
            except Exception as e:
                logger.error(f"Error calling Gemini API for entities: {e}. Falling back to rule-based entity extraction.")

        return self._local_fallback(text)

    def _local_fallback(self, text: str) -> dict[str, list[str]]:
        logger.info("Executing local fallback for EntityExtractor...")
        
        # Regexes for entity patterns
        company_rx = r'\b([A-Z][a-zA-Z0-9\s,\.\-&]+ (?:Pvt\b|Private\b|Ltd\b|Limited\b|Corp\b|Corporation\b|Inc\b|Incorporated\b|LLP\b|Partnership\b))\b'
        date_rx = r'\b(?:\d{1,2}(?:st|nd|rd|th)?[-/\s]?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s]?\d{2,4}|\d{1,2}[-/\s]\d{1,2}[-/\s]\d{2,4}|\d{4})\b'
        money_rx = r'(?:Rs\.?|INR|\$|£|€)\s*\d+(?:,\d{3})*(?:\.\d{2})?(?:\s*(?:Crore|Lakh|Million|Billion|Percent))?\b'
        percent_rx = r'\b\d+(?:\.\d+)?\s*%\s*(?:per annum|p\.a\.)?\b'
        # "Sanhita"/"Adhiniyam" cover the 2023 Indian criminal law reforms (BNS, BNSS,
        # BSA), which replaced "IPC"/"CrPC"/"Evidence Act" and don't fit an "Act, YYYY"
        # or "Code, YYYY" pattern — a real gap for FIRs and criminal filings, which now
        # cite these by default.
        act_rx = (
            r'\b((?:[A-Z][a-zA-Z0-9]*\s+(?:and\s+|of\s+|for\s+)?)*[A-Z][a-zA-Z0-9]*\s+Act,?\s*(?:18|19|20)\d{2})\b'
            r'|\b((?:[A-Z][a-zA-Z0-9]*\s+(?:and\s+|of\s+|for\s+)?)*[A-Z][a-zA-Z0-9]*\s+Code,?\s*(?:18|19|20)\d{2})\b'
            r'|\b(Bharatiya(?:\s+[A-Z][a-zA-Z]*)+\s+(?:Sanhita|Adhiniyam)(?:,?\s*(?:18|19|20)\d{2})?)\b'
        )
        known_abbreviations = ("IPC", "CrPC", "BNS", "BNSS", "BSA", "CPC", "POCSO", "NDPS", "IT Act", "PMLA")
        section_rx = r'\b(?:Section|Sec\.)\s*(\d+[A-Za-z0-9\-\(\)]*)\b'
        court_rx = r'\b([A-Z][A-Za-z\s]+ High Court|[A-Z][A-Za-z\s]+ District Court|Supreme Court of India|Supreme Court)\b'
        authority_rx = r'\b(SEBI|RBI|FEMA|TRAI|IRDAI|NCLT|NCLAT|CCI|Government of India|Ministry of [A-Z][a-zA-Z\s]+)\b'
        
        # Extract matching tokens/groups
        companies = list(set(re.findall(company_rx, text)))
        dates = list(set(re.findall(date_rx, text)))
        money = list(set(re.findall(money_rx, text)))
        percentages = list(set(re.findall(percent_rx, text)))
        
        # Clean up Acts finding due to optional groups
        acts_raw = re.findall(act_rx, text)
        acts = set(item[0] or item[1] or item[2] for item in acts_raw if item[0] or item[1] or item[2])
        for abbr in known_abbreviations:
            if re.search(rf'\b{re.escape(abbr)}\b', text):
                acts.add(abbr)
        acts = list(acts)
        
        sections = list(set(re.findall(section_rx, text)))
        courts = list(set(re.findall(court_rx, text)))
        authorities = list(set(re.findall(authority_rx, text)))
        
        # Basic signatures / signatories heuristic
        signatories = []
        # \b before the alternation is required — without it, "For" case-insensitively
        # matched the substring "FOR" hiding inside words like "INFORMATION", capturing
        # garbage like "MATION REPORT" as a fake signatory.
        sig_matches = re.finditer(r'\b(?:Signature|Signed by|Executed by|For)\b\s*:?\s*([A-Z][a-zA-Z\s\.\-]{2,30})', text, re.IGNORECASE)
        for m in sig_matches:
            name = m.group(1).strip()
            if name and not any(kw in name.lower() for kw in ["the", "authorized", "signatory", "on behalf"]):
                signatories.append(name)
        signatories = list(set(signatories))

        # Basic people extraction heuristic (simple capitalize names search or use signatories)
        people = list(signatories) # Signatories are people
        people_matches = re.finditer(r'\b(?:Mr\.|Ms\.|Mrs\.|Shri|Smt\.)\s*([A-Z][a-zA-Z\s]{2,20})\b', text)
        for m in people_matches:
            people.append(m.group(1).strip())
        people = list(set(people))

        # Basic addresses heuristic
        addresses = []
        addr_matches = re.finditer(r'(?:residing at|office at|registered office at|address at|having its office at)\s*:?\s*([A-Z0-9][A-Za-z0-9\s,\.\-\(\)\d/]{10,120})', text, re.IGNORECASE)
        for m in addr_matches:
            addr = m.group(1).strip()
            # Split address on terminal boundaries to avoid reading half document
            addr_split = re.split(r'(?:\n\n|\band\b|representing|\bherein\b|\bparty\b|\.|\;)', addr, maxsplit=1)
            addresses.append(addr_split[0].strip())
        addresses = list(set(addresses))

        return {
            "people": people[:10],
            "companies": companies[:10],
            "addresses": addresses[:5],
            "dates": dates[:15],
            "money": money[:10],
            "percentages": percentages[:10],
            "acts": acts[:5],
            "sections": sections[:15],
            "courts": courts[:5],
            "authorities": authorities[:5],
            "signatories": signatories[:5]
        }

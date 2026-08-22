import json
import re
import httpx
from typing import Any
from loguru import logger
from app.core.config import settings


class TimelineExtractor:
    """
    Extracts dates, milestones, deadlines, and compiles a chronological timeline.
    Uses Gemini LLM when configured, otherwise falls back to deterministic regex-based parsing.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def extract(self, text: str) -> list[dict[str, str]]:
        """
        Extract timeline events.
        """
        if not text:
            return []

        if self.api_key and "your-gemini-api-key" not in self.api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}
                
                system_instruction = (
                    "You are a Senior Legal Counsel. You must analyze the provided legal document "
                    "and compile a chronological timeline of all key events, deadlines, renewal dates, and milestones.\n"
                    "For each timeline item, specify:\n"
                    "- 'date': The exact date or relative time constraint (e.g., 'Effective Date', '30 days after signing', '2026-12-31').\n"
                    "- 'event': What occurs or is required on this date/timeline.\n"
                    "- 'type': One of 'Deadline', 'Milestone', 'Effective Date', 'Termination', 'Renewal', 'Payment'.\n"
                    "You MUST respond ONLY with a valid JSON array of objects containing these keys: "
                    "'date', 'event', 'type'."
                )
                
                prompt = f"Document Text:\n{text[:40000]}\n\nCompile timeline in JSON format."
                
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.1
                    }
                }

                logger.info("Calling Gemini API for Timeline Extraction...")
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, headers=headers, timeout=20.0)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(raw_text.strip())
                        if isinstance(parsed, dict) and "timeline" in parsed:
                            return parsed["timeline"]
                        elif isinstance(parsed, list):
                            return parsed
                        return []
                    else:
                        logger.warning(f"Gemini API returned status {resp.status_code}. Falling back to rule-based timeline extraction.")
            except Exception as e:
                logger.error(f"Error calling Gemini API for timeline: {e}. Falling back to rule-based timeline extraction.")

        return self._local_fallback(text)

    def _local_fallback(self, text: str) -> list[dict[str, str]]:
        logger.info("Executing local fallback for TimelineExtractor...")
        
        # Look for dates or time constraints in sentences
        sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
        timeline = []

        date_pattern = r'\b(?:\d{1,2}(?:st|nd|rd|th)?[-/\s]?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s]?\d{2,4}|\d{1,2}[-/\s]\d{1,2}[-/\s]\d{2,4}|\b(?:Effective Date|Signing Date|Execution Date|Expiry Date)\b)\b'
        relative_pattern = r'\b(?:within\s+\d+\s+(?:days|months|years)|prior\s+to\s+termination|upon\s+execution)\b'

        seen_events = set()

        for sent in sentences:
            has_date = re.search(date_pattern, sent, re.IGNORECASE)
            has_relative = re.search(relative_pattern, sent, re.IGNORECASE)
            
            if has_date or has_relative:
                date_str = "Effective Date"
                if has_date:
                    date_str = has_date.group(0)
                elif has_relative:
                    date_str = has_relative.group(0)

                # Determine event type
                event_type = "Milestone"
                if any(kw in sent.lower() for kw in ["pay", "invoice", "fee"]):
                    event_type = "Payment"
                elif any(kw in sent.lower() for kw in ["terminate", "termination", "expiry"]):
                    event_type = "Termination"
                elif any(kw in sent.lower() for kw in ["renew", "extension"]):
                    event_type = "Renewal"
                elif any(kw in sent.lower() for kw in ["deadline", "shall", "must"]):
                    event_type = "Deadline"
                elif any(kw in sent.lower() for kw in ["effective", "signing", "execution"]):
                    event_type = "Effective Date"

                # Limit event length
                event_desc = sent[:150] + "..." if len(sent) > 150 else sent

                # Avoid duplicate event listings
                if event_desc not in seen_events:
                    seen_events.add(event_desc)
                    timeline.append({
                        "date": date_str,
                        "event": event_desc,
                        "type": event_type
                    })
                
                if len(timeline) >= 10:
                    break

        # Sort timeline by putting "Effective Date" first if available
        timeline.sort(key=lambda x: 0 if "effective" in x["date"].lower() or "effective" in x["event"].lower() else 1)
        return timeline

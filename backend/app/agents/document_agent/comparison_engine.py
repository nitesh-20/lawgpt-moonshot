import json
import re
import httpx
from typing import Any
from loguru import logger
from app.core.config import settings


class ComparisonEngine:
    """
    Compares two legal documents (original vs modified) and identifies:
    - Inserted clauses
    - Deleted clauses
    - Modified clauses
    - Legal impact of changes
    - Risk shifts / updates
    - Summary of differences
    Uses Gemini LLM when configured, otherwise falls back to deterministic sequence comparison.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def compare(self, text_1: str, text_2: str) -> dict[str, Any]:
        """
        Compare text_1 (original/base) and text_2 (modified/target).
        """
        default_res = {
            "comparison_summary": "No difference detected.",
            "inserted_clauses": [],
            "deleted_clauses": [],
            "modified_clauses": [],
            "legal_impact": "None",
            "risk_changes": "None"
        }

        if not text_1 and not text_2:
            return default_res
        elif not text_1:
            return {
                "comparison_summary": "Original document is empty. Entire modified document represents insertions.",
                "inserted_clauses": [{"clause_text": text_2[:1000], "impact": "New document initialization."}],
                "deleted_clauses": [],
                "modified_clauses": [],
                "legal_impact": "Entire document added.",
                "risk_changes": "High risk - reviewing completely new terms."
            }
        elif not text_2:
            return {
                "comparison_summary": "Modified document is empty. Entire original document represents deletions.",
                "inserted_clauses": [],
                "deleted_clauses": [{"clause_text": text_1[:1000], "impact": "Complete removal of agreement terms."}],
                "modified_clauses": [],
                "legal_impact": "Agreement completely terminated/removed.",
                "risk_changes": "High risk - no legal terms active."
            }

        if self.api_key and "your-gemini-api-key" not in self.api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}
                
                system_instruction = (
                    "You are a Senior Legal Counsel specializing in contract review. Compare the two provided legal documents: "
                    "Document 1 (Original) and Document 2 (Modified/Updated).\n"
                    "Identify:\n"
                    "- 'comparison_summary': A cohesive overview of the major shifts between the two versions.\n"
                    "- 'inserted_clauses': List of completely new clauses added in Document 2. Provide 'clause_text' and 'impact'.\n"
                    "- 'deleted_clauses': List of clauses from Document 1 that were completely removed. Provide 'clause_text' and 'impact'.\n"
                    "- 'modified_clauses': Clauses that exist in both but were edited. Provide 'original_text', 'modified_text', 'difference' (what changed), and 'legal_impact'.\n"
                    "- 'legal_impact': Overall legal assessment of these edits.\n"
                    "- 'risk_changes': Detailed assessment of risk transfers (e.g. risk shifted to customer, liability increased).\n"
                    "You MUST respond ONLY with a valid JSON object containing these exact keys. Return empty arrays for keys with no differences."
                )
                
                prompt = (
                    f"Document 1 (Original):\n{text_1[:20000]}\n\n"
                    f"Document 2 (Modified):\n{text_2[:20000]}\n\n"
                    "Analyze and compare these documents in JSON format."
                )
                
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.1
                    }
                }

                logger.info("Calling Gemini API for Document Comparison...")
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, headers=headers, timeout=25.0)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(raw_text.strip())
                        return {
                            "comparison_summary": parsed.get("comparison_summary", ""),
                            "inserted_clauses": parsed.get("inserted_clauses", []),
                            "deleted_clauses": parsed.get("deleted_clauses", []),
                            "modified_clauses": parsed.get("modified_clauses", []),
                            "legal_impact": parsed.get("legal_impact", ""),
                            "risk_changes": parsed.get("risk_changes", "")
                        }
                    else:
                        logger.warning(f"Gemini API returned status {resp.status_code}. Falling back to rule-based document comparison.")
            except Exception as e:
                logger.error(f"Error calling Gemini API for comparison: {e}. Falling back to rule-based document comparison.")

        return self._local_fallback(text_1, text_2)

    def _local_fallback(self, text_1: str, text_2: str) -> dict[str, Any]:
        logger.info("Executing local fallback for ComparisonEngine...")
        
        # Paragraph-based diff fallback
        paragraphs_1 = [p.strip() for p in text_1.split("\n\n") if p.strip()]
        paragraphs_2 = [p.strip() for p in text_2.split("\n\n") if p.strip()]

        inserted = []
        deleted = []
        modified = []

        # Convert to sets for exact lookup
        set_1 = set(paragraphs_1)
        set_2 = set(paragraphs_2)

        # Basic similarity heuristic for modified paragraphs
        def similarity(s1: str, s2: str) -> float:
            words1 = set(s1.lower().split())
            words2 = set(s2.lower().split())
            if not words1 or not words2:
                return 0.0
            return len(words1.intersection(words2)) / len(words1.union(words2))

        # Track processed index of paragraphs in document 2
        processed_p2 = set()

        for p1 in paragraphs_1:
            if p1 in set_2:
                # Exists exactly, match index to mark processed
                matching_idx = paragraphs_2.index(p1)
                processed_p2.add(matching_idx)
                continue
            
            # Not in set_2, check if it was modified or deleted
            best_match_idx = -1
            best_score = 0.0
            for idx, p2 in enumerate(paragraphs_2):
                if idx in processed_p2:
                    continue
                score = similarity(p1, p2)
                if score > best_score:
                    best_score = score
                    best_match_idx = idx

            # If similarity is above threshold, call it modified
            if best_score > 0.4:
                modified.append({
                    "original_text": p1[:500],
                    "modified_text": paragraphs_2[best_match_idx][:500],
                    "difference": "Clarification updates and parameter modifications.",
                    "legal_impact": "Mild impact depending on modified parameters."
                })
                processed_p2.add(best_match_idx)
            else:
                deleted.append({
                    "clause_text": p1[:500],
                    "impact": "Removal of terms. Review if this removes critical protections."
                })

        for idx, p2 in enumerate(paragraphs_2):
            if idx not in processed_p2:
                inserted.append({
                    "clause_text": p2[:500],
                    "impact": "New obligation or clause. Review for potential liability introduction."
                })

        # Summarize legal impact
        overall_impact = "No major legal changes detected."
        risk_changes = "No significant risk adjustments."

        if inserted or deleted or modified:
            changes_desc = []
            if inserted:
                changes_desc.append(f"{len(inserted)} insertions")
            if deleted:
                changes_desc.append(f"{len(deleted)} deletions")
            if modified:
                changes_desc.append(f"{len(modified)} modifications")
            
            summary = f"Detected changes between the two documents: {', '.join(changes_desc)}."
            overall_impact = "Contract terms have been updated. Reviews are recommended for indemnity and liability changes."
            risk_changes = "Liability parameters might have shifted with clause insertions/deletions. Confirm caps are intact."
        else:
            summary = "The documents are identical. No differences found."

        return {
            "comparison_summary": summary,
            "inserted_clauses": inserted[:5],
            "deleted_clauses": deleted[:5],
            "modified_clauses": modified[:5],
            "legal_impact": overall_impact,
            "risk_changes": risk_changes
        }

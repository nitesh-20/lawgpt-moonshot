import re
from datetime import datetime
from typing import Any


class RankingEngine:
    """
    Ranks retrieved context chunks by:
    - Semantic similarity
    - Authority (Constitution > Central Acts > State Acts > Rules)
    - Jurisdiction matching
    - Legal relevance (exact section/act matches)
    - Recency (newer enactments or judgments)
    Additionally deduplicates/merges duplicate chunk hits.
    """

    def rank(
        self,
        chunks: list[dict[str, Any]],
        query: str,
        detected_info: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Ranks chunks based on a multi-factor legal relevance score and merges duplicates.
        """
        if not chunks:
            return []

        # 1. Merge duplicates (by chunk_id or text similarity)
        seen_ids = set()
        seen_texts = set()
        unique_chunks = []

        for chunk in chunks:
            chunk_id = chunk.get("chunk_id")
            text = chunk.get("text", "").strip()

            if chunk_id in seen_ids or text in seen_texts:
                continue

            seen_ids.add(chunk_id)
            seen_texts.add(text)
            unique_chunks.append(chunk)

        # 2. Score chunks
        query_lower = query.lower()
        scored_chunks = []

        for chunk in unique_chunks:
            # Base score is the retrieval hybrid score (defaults to 0.5 if missing)
            base_score = chunk.get("score", 0.5)

            # Heuristics boosts
            authority_boost = 0.0
            jurisdiction_boost = 0.0
            relevance_boost = 0.0
            recency_boost = 0.0

            # A. Authority Boost
            category = str(chunk.get("category", "")).lower()
            act_type = str(chunk.get("act_type", "")).lower()
            doc_id = str(chunk.get("document_id", "")).lower()

            if "constitution" in category or "constitution" in doc_id:
                authority_boost = 0.15
            elif "act" in act_type or "act" in category:
                authority_boost = 0.10
            elif "rules" in act_type or "rules" in category:
                authority_boost = 0.05

            # B. Jurisdiction Boost
            chunk_jurisdiction = str(chunk.get("jurisdiction", "")).lower()
            if chunk_jurisdiction and chunk_jurisdiction in query_lower:
                jurisdiction_boost = 0.15
            elif "supreme court" in query_lower and "supreme" in chunk_jurisdiction:
                jurisdiction_boost = 0.15

            # C. Legal Relevance Boost (extracted sections or acts matching)
            chunk_text_lower = chunk.get("text", "").lower()

            # Exact section match
            for sec in detected_info.get("detected_sections", []):
                # Search for section numbers, e.g., "section 302" or "302" near "section"
                if re.search(rf"\b{sec}\b", chunk_text_lower):
                    relevance_boost += 0.10
                    break

            # Exact act name match
            for act in detected_info.get("detected_acts", []):
                if act.lower() in chunk_text_lower or act.lower() in doc_id:
                    relevance_boost += 0.10
                    break

            # D. Recency Boost (e.g., Bharatiya Nyaya Sanhita vs IPC)
            # Newer acts enacted post-2020 get a boost
            if "bharatiya" in doc_id or "bns" in doc_id or "dpdp" in doc_id or "202" in doc_id:
                recency_boost = 0.10
            else:
                created_at = chunk.get("created_at")
                if created_at:
                    try:
                        # Extract year if possible
                        dt = datetime.fromisoformat(created_at.replace("Z", ""))
                        if dt.year >= 2023:
                            recency_boost = 0.08
                        elif dt.year >= 2020:
                            recency_boost = 0.05
                    except Exception:
                        pass

            # Combine scores (max bound is 1.0)
            final_score = min(
                1.0,
                base_score
                + authority_boost
                + jurisdiction_boost
                + relevance_boost
                + recency_boost,
            )

            # Update the score in chunk metadata
            c_copy = dict(chunk)
            c_copy["score"] = round(final_score, 3)
            scored_chunks.append(c_copy)

        # Sort by final score descending
        scored_chunks.sort(key=lambda x: x.get("score", 0.0), reverse=True)
        return scored_chunks

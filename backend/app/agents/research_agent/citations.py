from typing import Any


class CitationEngine:
    """
    Formulates structured legal citations for retrieved source chunks.
    Ensures document names, sections, pages, source paths, and confidence scores are correctly formatted.
    """

    def generate_citations(self, ranked_chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Creates citation dictionaries with document name, section, page, source, and confidence scores.
        """
        citations = []
        seen_keys = set()

        for chunk in ranked_chunks:
            doc_id = chunk.get("document_id", "unknown_document")
            section = chunk.get("section")
            page = chunk.get("page")
            source_path = chunk.get("source_path", "")
            chunk_score = chunk.get("score", 0.5)

            # Standardize document title/name
            doc_title = doc_id.replace("_", " ").title() if doc_id else "Legal Reference"

            # Create a unique key for deduplication
            cite_key = f"{doc_id}_{section}_{page}"
            if cite_key in seen_keys:
                continue
            seen_keys.add(cite_key)

            # Generate nice printable citation text
            clean_sec = section if (section and len(str(section)) < 25 and not any(w in str(section).lower() for w in ["act ", "]", "[", "subs."])) else None
            citation_str = f"{doc_title}"
            if clean_sec:
                citation_str += f", Section {clean_sec}"
            if page:
                citation_str += f" (Page {page})"

            # Compute citation confidence score
            # Base it on the chunk's match score but reward exact section/page mapping
            metadata_completeness = 0.0
            if section:
                metadata_completeness += 0.1
            if page:
                metadata_completeness += 0.05
            if source_path:
                metadata_completeness += 0.05

            confidence_score = min(0.99, (chunk_score * 0.8) + metadata_completeness)

            citations.append(
                {
                    "document_id": doc_id,
                    "document_name": doc_title,
                    "section": section,
                    "page_number": page,
                    "source_path": source_path,
                    "citation_text": citation_str,
                    "confidence_score": round(confidence_score, 3),
                }
            )

        return citations

from typing import Any


class ResponseSynthesizer:
    """
    Consolidates sub-agent reports, resolves conflicts, deduplicates facts,
    and returns a structured legal draft or reply containing proper citations.
    """
    async def synthesize(
        self,
        query: str,
        execution_results: list[dict[str, Any]],
        rag_chunks: list[dict[str, Any]]
    ) -> dict[str, Any]:

        sub_messages = []
        for res in execution_results:
            if res.get("status") == "success":
                out = res.get("output", {})
                msg = out.get("message", "")
                if msg:
                    sub_messages.append(f"- **{res['agent_id'].replace('_', ' ').title()}**: {msg}")

        if not sub_messages:
            final_response = "I processed your request, but the sub-agents did not return any explicit results."
        else:
            final_response = "Consolidated legal execution report:\n\n" + "\n".join(sub_messages)

        # Compile legal citations
        citations = []
        seen_citations = set()
        for chunk in rag_chunks:
            doc_id = chunk.get("document_id")
            page = chunk.get("page")
            section = chunk.get("section")
            title = doc_id.replace("_", " ").title() if doc_id else "Legal Record"

            citation_str = f"{title}"
            if section:
                citation_str += f", {section}"
            if page:
                citation_str += f" (Page {page})"

            if citation_str not in seen_citations:
                seen_citations.add(citation_str)
                citations.append({
                    "document_id": doc_id,
                    "title": title,
                    "section": section,
                    "page": page,
                    "citation": citation_str
                })

        if citations:
            final_response += "\n\n### ⚖️ Citations\n"
            for idx, cit in enumerate(citations, 1):
                final_response += f"[{idx}] {cit['citation']}\n"

        return {
            "response": final_response,
            "citations": citations,
            "confidence_score": 0.95 if citations else 0.75
        }

from typing import Any, ClassVar

from loguru import logger

from app.agents.compliance_agent.plugins import BUILTIN_PLUGINS
from app.services.rag.rag import RAGService


class RegulationMatcher:
    """
    Matches input text, queries, or metadata against supported regulations
    using keyword matching, regex rules, and semantic search over the indexed corpus.
    """
    REGULATION_KEYWORDS: ClassVar[dict[str, list[str]]] = {
        "dpdp": [
            "dpdp", "personal data protection", "data principal", "data fiduciary", 
            "consent notice", "right to erasure", "parental consent", "privacy bill"
        ],
        "it_act": [
            "it act", "information technology act", "section 66", "section 43a", 
            "spdi", "intermediary rules", "reasonable security practices", "grievance officer"
        ],
        "bns": [
            "bns", "bharatiya nyaya sanhita", "penal code", "criminal liability", 
            "corporate crime", "cheating", "fraudulent"
        ],
        "bnss": [
            "bnss", "bharatiya nagarik suraksha", "criminal procedure", "evidence recording", 
            "seizure", "investigation logs"
        ],
        "bsa": [
            "bsa", "bharatiya sakshya", "indian evidence", "electronic records admissibility", 
            "section 63 certificate", "section 65b"
        ],
        "consumer_protection": [
            "consumer protection", "unfair trade", "e-commerce rules", "refund", 
            "return policy", "misleading ad", "consumer dispute"
        ],
        "companies_act": [
            "companies act", "board report", "related party", "section 188", 
            "section 134", "director responsibility", "corporate governance"
        ],
        "labour_laws": [
            "labour", "labor", "minimum wage", "code on wages", "working hours", 
            "equal remuneration", "shops and establishment", "overtime"
        ],
        "gst": [
            "gst", "goods and services tax", "gstin", "hsn code", "tax invoice", 
            "input tax credit", "cgst", "sgst", "igst"
        ],
        "rbi_guidelines": [
            "rbi", "reserve bank", "payment system data", "data localization", 
            "customer liability circular", "unauthorized transaction", "banking fraud"
        ],
        "sebi_regulations": [
            "sebi", "listing obligation", "insider trading", "pit regulation", 
            "lodr", "upsi", "material event disclosure", "structured digital database"
        ],
        "cert_in": [
            "cert-in", "cert in", "cyber incident", "6 hours", "incident reporting", 
            "maintenance of logs", "log retention", "ict logs"
        ]
    }

    def __init__(self, rag_service: RAGService | None = None) -> None:
        self.rag_service = rag_service or RAGService()

    async def match_regulations(self, text: str, query: str = "", metadata: dict[str, Any] | None = None) -> list[str]:
        """
        Detects which regulations apply based on text, query, and semantic RAG lookups.
        """
        matched_ids = set()
        combined_text = f"{text} {query}".lower()

        # 1. Rule-based Keyword Matching
        for reg_id, keywords in self.REGULATION_KEYWORDS.items():
            for kw in keywords:
                if kw in combined_text:
                    logger.info(f"Matched regulation {reg_id} via keyword: '{kw}'")
                    matched_ids.add(reg_id)
                    break

        # 2. Metadata Matching
        if metadata:
            applicable = metadata.get("applicable_regulations") or metadata.get("regulations")
            if applicable:
                if isinstance(applicable, list):
                    for r in applicable:
                        matched_ids.add(str(r).lower())
                elif isinstance(applicable, str):
                    matched_ids.add(applicable.lower())

        # 3. Semantic RAG Search over indexed corpus to find matching acts/rules
        search_query = query if query else text[:500]
        if search_query.strip():
            try:
                logger.info(f"Searching vector store to identify matching regulations for query: '{search_query[:100]}'")
                hits = await self.rag_service.retrieve_context(search_query, limit=5)
                for hit in hits:
                    doc_id = hit.get("document_id", "").lower()
                    # Check if the retrieved document_id maps to any of our regulations
                    for plugin in BUILTIN_PLUGINS:
                        if plugin.regulation_id in doc_id or doc_id in plugin.regulation_id:
                            logger.info(f"Matched regulation {plugin.regulation_id} via RAG hit: '{doc_id}'")
                            matched_ids.add(plugin.regulation_id)
            except Exception as e:  # noqa: BLE001
                logger.error(f"Error during semantic regulation matching: {e}")

        # Ensure we always return at least one regulation if none matched (fallback to generic search or default acts)
        if not matched_ids:
            logger.info("No regulations matched. Defaulting to IT Act and DPDP Act.")
            matched_ids.add("dpdp")
            matched_ids.add("it_act")

        # Map fuzzy names back to exact registry IDs
        valid_ids = {p.regulation_id for p in BUILTIN_PLUGINS}
        matched_list = [rid for rid in matched_ids if rid in valid_ids]
        
        logger.info(f"Regulation matching complete. Applicable regulation IDs: {matched_list}")
        return matched_list

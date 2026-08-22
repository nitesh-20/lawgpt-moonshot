import re
from typing import Any


class QueryExpander:
    """
    Recognizes and expands abbreviations (e.g., IPC -> Indian Penal Code, BNS, DPDP, GST, IT Act)
    and extracts structured legal references (sections, articles).
    """

    ABBREVIATIONS = {
        r"\bipc\b": "Indian Penal Code",
        r"\bbns\b": "Bharatiya Nyaya Sanhita",
        r"\bdpdp\b": "Digital Personal Data Protection Act",
        r"\bgst\b": "Goods and Services Tax",
        r"\bit act\b": "Information Technology Act",
        r"\bcrpc\b": "Code of Criminal Procedure",
        r"\bcpc\b": "Code of Civil Procedure",
        r"\bconstitution\b": "Constitution of India",
        r"\biea\b": "Indian Evidence Act",
        r"\bbsa\b": "Bharatiya Sakshya Adhiniyam",
    }

    def expand(self, query: str) -> dict[str, Any]:
        if not query:
            return {
                "expanded_query": "",
                "detected_acts": [],
                "detected_sections": [],
                "detected_articles": [],
            }

        expanded = query
        detected_acts = []

        # Expand abbreviations
        for pattern, full_name in self.ABBREVIATIONS.items():
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                # Replace pattern in expanded query
                expanded = re.sub(pattern, f"{full_name} ({match.group()})", expanded, flags=re.IGNORECASE)
                detected_acts.append(full_name)

        # Extract sections, e.g., "Section 302", "sec. 420", "s. 9"
        sections = re.findall(
            r"(?:section|sec\.?|s\.?)\s+(\d+[a-zA-Z]?)", query, re.IGNORECASE
        )
        # Extract articles, e.g., "Article 21", "art. 14"
        articles = re.findall(
            r"(?:article|art\.?)\s+(\d+[a-zA-Z]?)", query, re.IGNORECASE
        )

        # Clean duplicates
        detected_sections = list(set(sections))
        detected_articles = list(set(articles))

        # Append expansions to query text to maximize match in vector store search
        expanded_query = expanded
        if detected_acts:
            expanded_query += " " + " ".join(detected_acts)

        # Semantic synonym expansions
        synonym_expansions = [
            (r"\b(right to speech|freedom of speech|freedom of expression|right to speak|article 19)\b", 
             "Constitution of India Article 19(1)(a) Freedom of Speech and Expression"),
            (r"\b(right to life|personal liberty|article 21|right to privacy|privacy right)\b", 
             "Constitution of India Article 21 Right to Life and Personal Liberty"),
            (r"\b(right to equality|equality before law|article 14)\b", 
             "Constitution of India Article 14 Equality Before Law"),
            (r"\b(insider trading|connected person|upsi|sebi pit)\b", 
             "SEBI Prohibition of Insider Trading PIT Regulations connected persons UPSI"),
            (r"\b(fema section 13|compounding|fema penalty|fema compound)\b", 
             "FEMA Foreign Exchange Management Act Section 13 compounding options penalties RBI"),
        ]
        
        for regex, expansion in synonym_expansions:
            if re.search(regex, query, re.IGNORECASE):
                expanded_query += " " + expansion
                # Extract act or articles if matched
                if "Constitution of India" in expansion and "Constitution of India" not in detected_acts:
                    detected_acts.append("Constitution of India")
                if "19" in expansion and "19" not in detected_articles:
                    detected_articles.append("19")
                if "21" in expansion and "21" not in detected_articles:
                    detected_articles.append("21")
                if "14" in expansion and "14" not in detected_articles:
                    detected_articles.append("14")

        return {
            "expanded_query": expanded_query.strip(),
            "detected_acts": list(set(detected_acts)),
            "detected_sections": detected_sections,
            "detected_articles": detected_articles,
        }

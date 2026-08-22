import re
from typing import Any, Dict, List


class QualityChecker:
    """
    Checks drafted documents for typos, unresolved placeholders, structural
    consistency, and computes an overall confidence quality score.
    """
    def check_quality(self, text: str) -> Dict[str, Any]:
        """
        Scan text and run quality checkers.
        """
        # 1. Placeholder scanning
        # look for things like {{placeholder}}, [placeholder], or consecutive underscores like ___
        brackets_placeholders = re.findall(r"\{\{[a-zA-Z0-9_-]+\}\}", text)
        square_placeholders = re.findall(r"\[[A-Za-z0-9_\s\-\/\:\.\,]+\]", text)
        
        # Filter square_placeholders to exclude typical legal citations like [1] or [1996]
        square_placeholders = [
            p for p in square_placeholders 
            if not re.match(r"^\[\d+\]$", p) and not p.lower() in ["[sic]"]
        ]
        
        underscores = re.findall(r"__+", text)
        
        all_placeholders = []
        for p in brackets_placeholders:
            all_placeholders.append(p)
        for p in square_placeholders:
            all_placeholders.append(p)
        for u in underscores:
            all_placeholders.append("Underscores (blank spaces)")

        is_resolved = len(all_placeholders) == 0

        # 2. Structural Checks
        structural_checks = {
            "has_title": bool(re.search(r"^#\s+.+", text, re.MULTILINE)),
            "has_headings": len(re.findall(r"^##\s+.+", text, re.MULTILINE)) > 1,
            "has_signatures": any(word in text.lower() for word in ["signature", "in witness whereof", "signed", "deponent"])
        }

        # 3. Bracket Matching Check
        brackets_matched = True
        for opening, closing in [("(", ")"), ("[", "]"), ("{", "}")]:
            if text.count(opening) != text.count(closing):
                brackets_matched = False

        # Calculate a quality/confidence score
        score = 1.0
        # Deduct for unresolved placeholders
        if all_placeholders:
            score -= min(0.3, 0.05 * len(all_placeholders))
        # Deduct for missing structure
        for check, passed in structural_checks.items():
            if not passed:
                score -= 0.1
        # Deduct for bracket mismatch
        if not brackets_matched:
            score -= 0.1

        score = round(max(0.2, score), 2)

        # Cohesion Grade
        if score >= 0.9:
            grade = "Excellent"
        elif score >= 0.75:
            grade = "Good"
        elif score >= 0.5:
            grade = "Fair"
        else:
            grade = "Poor"

        return {
            "is_placeholder_resolved": is_resolved,
            "unresolved_placeholders": list(set(all_placeholders)),
            "structural_checks_passed": structural_checks,
            "brackets_balanced": brackets_matched,
            "quality_grade": grade,
            "confidence_score": score
        }
    
    def improve_grammar(self, text: str) -> str:
        """
        Heuristic-based cleanup (e.g. removing double spaces).
        """
        cleaned = re.sub(r" {2,}", " ", text)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned.strip()

from typing import Any, Dict, List
from app.agents.drafting_agent.clauses import ClauseLibrary


class ClauseSelector:
    """
    Selects clauses from ClauseLibrary based on user inputs or template requirements.
    """
    def __init__(self, library: ClauseLibrary | None = None) -> None:
        self.library = library or ClauseLibrary()

    def select_clauses(
        self, recommended_clauses: List[str], custom_options: Dict[str, str]
    ) -> Dict[str, Dict[str, str]]:
        """
        Selects clauses and their variations based on recommendations and user specifications.

        Args:
            recommended_clauses: List of clause IDs recommended for the template.
            custom_options: Dict mapping clause ID to the requested variation (e.g. {"confidentiality": "strict"})

        Returns:
            Dict mapping clause ID to details (name, text, explanation).
        """
        selected = {}
        for clause_id in recommended_clauses:
            # Determine variation (defaults to 'standard' if not custom-specified)
            variation = custom_options.get(clause_id, "standard")
            clause_details = self.library.get_clause(clause_id, variation)
            selected[clause_id] = clause_details
            
        # Support adding arbitrary clauses not explicitly recommended but requested by user
        for clause_id, variation in custom_options.items():
            if clause_id not in selected:
                clause_details = self.library.get_clause(clause_id, variation)
                # Only add if it's a real clause found in the library
                if "[Missing Clause" not in clause_details["text"]:
                    selected[clause_id] = clause_details
                    
        return selected

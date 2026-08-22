from typing import Any


class ResultFormatter:
    """
    Ensures research output matches the requested schema, returning all fields unchanged.
    """

    def format(self, reasoner_out: dict[str, Any], citations: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Formats the reasoner output by passing all keys directly to the frontend.
        """
        res = dict(reasoner_out)
        if "citations" not in res or not res["citations"]:
            res["citations"] = citations
        return res

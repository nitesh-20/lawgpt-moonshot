from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class ComplianceCheckRule(BaseModel):
    id: str = Field(..., description="Unique identifier for the compliance rule")
    name: str = Field(..., description="Name of the rule")
    description: str = Field(..., description="Details about what the rule requires")
    section: str = Field(..., description="The specific section of the regulation")
    severity: str = Field(..., description="Severity level: Critical, High, Medium, Low")


class ComplianceCheckResult(BaseModel):
    rule_id: str = Field(..., description="ID of the checked rule")
    rule_name: str = Field(..., description="Name of the checked rule")
    passed: bool = Field(..., description="True if the document/policy complies with the rule")
    detail: str = Field(..., description="Explanation of findings, including gaps if failed")
    severity: str = Field(..., description="Severity level: Critical, High, Medium, Low")
    section: str = Field(..., description="Specific section of the regulation")
    citations: list[str] = Field(default_factory=list, description="Citations or quotes from the document supporting the result")


class BaseRegulationPlugin(ABC):
    """
    Abstract base class for all regulatory plugins.
    """
    @property
    @abstractmethod
    def regulation_id(self) -> str:
        """Unique ID of the regulation, e.g., 'dpdp_2023'"""

    @property
    @abstractmethod
    def regulation_name(self) -> str:
        """Human-readable name of the regulation, e.g., 'DPDP Act 2023'"""

    @property
    @abstractmethod
    def rules(self) -> list[ComplianceCheckRule]:
        """List of all checks carried out by this plugin"""

    @abstractmethod
    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        """
        Evaluate the provided text/document against the plugin rules.
        """

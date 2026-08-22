# Compliance Agent

The **Compliance Agent** is an enterprise-grade agent designed to analyze uploaded documents, user queries, or company policies against indexed Indian laws and regulations. It evaluates compliance rules, performs gap analysis, generates risk scores, and compiles actionable remediation reports.

---

## Architecture & Components

The Compliance Agent follows a highly modular, decoupled design:

```
  Input (Query/File/Doc ID)
            │
            ▼
   ┌─────────────────┐
   │ ComplianceAgent │ (BaseAgent Lifecycle Interface)
   └────────┬────────┘
            │
            ▼
   ┌──────────────────┐
   │ ComplianceEngine │ (Orchestrates execution workflow)
   └────────┬─────────┘
            │
      ┌─────┼──────────────┬──────────────┐
      ▼     ▼              ▼              ▼
┌─────────┐┌──────────┐┌───────┐┌──────────────┐
│Matcher  ││Analyzer  ││Scorer ││Recommendation│
└─────────┘└────┬─────┘└───────┘└──────────────┘
                │
                ▼
          ┌──────────┐
          │Mapper    │
          └──────────┘
```

1. **ComplianceAgent**: Integrates with the central Orchestrator. Exposes base agent lifecycles (`initialize`, `execute`, `shutdown`, `health`) and routes tasks.
2. **ComplianceEngine**: Runs the linear audit flow: parses inputs, resolves document text, triggers matching, performs gap checks, scores risks, generates recommendations, and formats reports.
3. **RegulationMatcher**: Matches input against supported acts using keywords, manifest metadata, and semantic RAG search queries.
4. **GapAnalyzer**: Runs matching regulatory plugins, dividing rules into passed and failed checks.
5. **PolicyMapper**: Maps internal company policies or operational text to specific regulatory clauses to evaluate alignment.
6. **RiskScorer**: Calculates overall scores (0-100), risk levels, and confidence ratings.
7. **RecommendationEngine**: Maps failed rules to specific corrective actions and legal references.
8. **ComplianceReportGenerator**: Compiles all findings into a structured report payload.

---

## Supported Regulations & Plugins

The agent uses a pluggable plugin architecture (`BaseRegulationPlugin`). Out of the box, the following regulations are supported:

| Regulation ID | Regulation Name | Key Focus |
| :--- | :--- | :--- |
| `dpdp` | Digital Personal Data Protection Act, 2023 | Consent notices, data principal rights, security safeguards, children's data. |
| `it_act` | Information Technology Act, 2000 | Intermediary guidelines, SPDI security standards, Grievance Officers. |
| `bns` | Bharatiya Nyaya Sanhita | Penal liability, fraud prevention, corporate crime. |
| `bnss` | Bharatiya Nagarik Suraksha Sanhita | Admissibility procedures, electronic investigation logs. |
| `bsa` | Bharatiya Sakshya Adhiniyam | Electronic record certifications (Section 63/65B). |
| `consumer_protection` | Consumer Protection Act | E-commerce seller disclosures, refund terms, unfair trade practices. |
| `companies_act` | Companies Act, 2013 | Section 134 board responsibilities, Section 188 related party transactions. |
| `labour_laws` | Labour Codes | Standard working hours, overtime wages, equal remuneration. |
| `gst` | GST Regulations | Section 31 tax invoice details (GSTIN, HSN/SAC), return filing. |
| `rbi_guidelines` | RBI Guidelines | Payments data localization, customer liability in electronic transactions. |
| `sebi_regulations` | SEBI Regulations | Prohibition of Insider Trading (PIT), SDD logs, Listing material disclosures (LODR). |
| `cert_in` | CERT-In Directions | 6-hour incident report timeline, 180-day ICT log maintenance. |

---

## Adding a New Regulation Plugin

To register a new regulation, subclass `BaseRegulationPlugin` inside `plugins.py` and add it to `BUILTIN_PLUGINS`:

```python
from app.agents.compliance_agent.base_plugin import BaseRegulationPlugin, ComplianceCheckRule, ComplianceCheckResult

class MyFutureActPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "my_future_act"

    @property
    def regulation_name(self) -> str:
        return "My Future Act"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="MY_RULE_001",
                name="Mandatory Disclosure",
                description="Requires publishing standard disclosures.",
                section="Section 10",
                severity="High"
            )
        ]

    async def evaluate(self, text: str, context: dict = None) -> list[ComplianceCheckResult]:
        # Implementation logic or helper evaluation
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)
```

---

## Risk Scoring Rules

### 1. Severity Weights
- **Critical**: `4.0`
- **High**: `2.0`
- **Medium**: `1.0`
- **Low**: `0.5`

### 2. Score Calculation
The overall score is a weighted pass rate:
$$\text{Compliance Score} = \left( \frac{\sum \text{Weights of Passed Checks}}{\sum \text{Weights of All Checks}} \right) \times 100$$

### 3. Risk Level Mapping and Overrides
Risk Levels are initially mapped from the score:
- Score $\ge 90$: **Low**
- Score $70 - 89$: **Medium**
- Score $50 - 69$: **High**
- Score $< 50$: **Critical**

> [!WARNING]
> **Severity Overrides**
> - If **any** failed check has a severity of **Critical**, the overall risk level is forced to **Critical** regardless of the score.
> - If **any** failed check has a severity of **High**, the overall risk level is forced to at least **High**.

---

## API Documentation

### 1. POST `/api/v1/compliance/check`
Evaluates compliance on raw text or document references.

**Payload**:
```json
{
  "query": "Apply DPDP rules to audit our user workflow policy.",
  "document_id": "doc_12345",
  "file_path": null,
  "regulation_ids": ["dpdp"]
}
```

### 2. POST `/api/v1/compliance/report`
Evaluates compliance and compiles a formal report formatted as JSON or Markdown.

**Payload**:
```json
{
  "query": "Audit CERT-In data compliance rules.",
  "report_format": "markdown"
}
```

### 3. GET `/api/v1/compliance/history`
Returns logs of all past audits.

### 4. GET `/api/v1/compliance/statistics`
Aggregates health metrics over all history records:
```json
{
  "total_audits_conducted": 12,
  "average_compliance_score": 88.5,
  "risk_level_distribution": {
    "Critical": 1,
    "High": 2,
    "Medium": 4,
    "Low": 5
  },
  "top_violated_rules": {
    "DPDP_CONSENT_NOTICE": 3,
    "CERT_CYBER_INCIDENT_REPORT": 2
  },
  "popular_regulations_audited": {
    "dpdp": 10,
    "cert_in": 8
  }
}
```

# Legal Drafting Agent Documentation

The **Legal Drafting Agent** is a production-grade, modular, and extensible system within the LawGPT AI OS designed to automate the lifecycle of legal documents, contracts, policies, and letters. It provides capabilities to generate new agreements, review existing drafts, rewrite clauses, identify risks, check compliance, and track version history.

---

## 1. Architecture

The Drafting Agent resides in `backend/app/agents/drafting_agent/` and coordinates several sub-components:

```
[User Request] 
      ↓
[DraftingAgent (Core Controller)]
      ├── TemplateManager   <── (Manages contract blueprints)
      ├── ClauseLibrary     <── (Catalog of standard clauses: standard, strict, mutual)
      ├── ClauseSelector    <── (Matches options with appropriate clause variations)
      ├── DraftGenerator    <── (Injects variables, renders content using Gemini or local template)
      ├── DocumentReviewer  <── (Audits quality, checks compliance/risks using RiskDetector & ComplianceEngine)
      ├── RedlineEngine     <── (Computes delta edits between versions reusing ComparisonEngine)
      ├── VersionManager    <── (Logs drafts to Firestore or local file revisions)
      └── QualityChecker    <── (Scans for leftover placeholders, grammar issues, balances brackets)
```

---

## 2. Execution Flow

The agent supports four core actions, matching the exposed REST API endpoints:

### Action: Generate
1. The **TemplateManager** retrieves the default layout skeleton for the chosen contract type.
2. The **ClauseSelector** resolves recommended clauses and overrides them with any custom options (e.g. choosing a "strict" confidentiality clause).
3. The **DraftGenerator** combines the template and selected clauses, replacing variables (dates, names, values). If `GEMINI_API_KEY` is present, it uses Gemini to tailor and customize the draft. Otherwise, it uses a regex-based rendering engine.
4. The **QualityChecker** scans for bracket balance, formatting consistency, and remaining placeholders, outputting a quality score.
5. The **VersionManager** increments the contract revision history and saves the draft.

### Action: Review
1. Runs the document through **DocumentIntelligence**'s `RiskDetector` to identify risk exposure.
2. Invokes the **ComplianceEngine** to audit terms against active regulations.
3. Compares the document structure against recommended clauses for the document type to report missing sections.
4. Synthesizes a list of recommended improvements.

### Action: Redline
1. Receives the `original_text` and `revised_text` of a contract.
2. Uses **DocumentIntelligence**'s `ComparisonEngine` to detect lines inserted, deleted, or modified.
3. Generates a summary of shifts in legal risk.

### Action: Improve
1. Takes a contract draft or single clause.
2. Renders the draft with user-customized improvement guidelines (e.g., "Simplify legalese" or "Make pro-client").

---

## 3. Template System

Templates are stored as JSON files under `backend/data/templates/`. Each template includes:
- **name**: Descriptive title.
- **description**: Summary of the document purpose.
- **required_variables**: Placeholders like `{{effective_date}}`, `{{employer_name}}`.
- **recommended_clauses**: Core clauses associated with this contract.
- **boilerplate**: Markdown layout containing the main text flow and clause placeholders.

### Supported Templates out-of-the-box:
1. Non-Disclosure Agreement (NDA)
2. Employment Agreement
3. Offer Letter
4. Lease Agreement
5. Service Agreement
6. Partnership Agreement
7. Vendor Agreement
8. Privacy Policy
9. Terms & Conditions
10. Legal Notice
11. Reply Notice
12. Affidavit
13. Memorandum of Understanding (MoU)
14. General Contracts

---

## 4. Clause Library

The `ClauseLibrary` provides pre-authored standard wording variations (e.g. Standard, Strict, Mutual) and plain-English explanations for major contract headings:
- **Confidentiality**
- **Termination**
- **Force Majeure**
- **Indemnity**
- **Jurisdiction**
- **Arbitration**
- **Liability**
- **Intellectual Property**
- **Data Protection**
- **Payment**
- **Renewal**
- **Notice**
- **Governing Law**

---

## 5. Extension Guide: Adding New Templates & Clauses

### How to Add a New Template
1. Create a new JSON file in `backend/data/templates/` named after the document type (e.g., `independent_contractor_agreement.json`).
2. Provide the standard structure:
```json
{
  "name": "Independent Contractor Agreement",
  "description": "Engage an independent contractor for technical projects.",
  "required_variables": ["contractor_name", "effective_date", "fees"],
  "recommended_clauses": ["intellectual_property", "termination", "payment", "governing_law"],
  "boilerplate": "# INDEPENDENT CONTRACTOR AGREEMENT\n\nThis Agreement is entered into on {{effective_date}}... \n\n## 1. PAYMENTS\n{{payment}}\n\n## 2. INTELLECTUAL PROPERTY\n{{intellectual_property}}..."
}
```
3. Load the TemplateManager. It will automatically detect, validate, and serve the new template.

### How to Add a New Clause
1. Open `backend/app/agents/drafting_agent/clauses.py`.
2. Add your new clause dictionary to `self._library` inside `__init__`:
```python
"severability": {
    "name": "Severability",
    "description": "Ensures that if one clause is found invalid, the rest of the contract remains in force.",
    "variations": {
        "standard": "If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect."
    },
    "explanations": {
        "standard": "If a court rules one sentence of the contract is invalid, the rest of the contract still counts."
    }
}
```

import json
import os
from pathlib import Path
from typing import Any, Dict, List
from app.core.config import settings


class TemplateManager:
    """
    Manages loading, retrieval, and storage of legal document templates.
    """
    def __init__(self, templates_dir: Path | None = None) -> None:
        self.templates_dir = templates_dir or settings.BASE_DIR / "data" / "templates"
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        self._initialize_default_templates()

    def get_template(self, doc_type: str) -> Dict[str, Any] | None:
        """
        Retrieves a template by document type. Checks local directory first,
        falling back to default templates.
        """
        filename = f"{doc_type.lower().replace(' ', '_')}.json"
        filepath = self.templates_dir / filename
        
        if filepath.exists():
            try:
                with open(filepath, "r") as f:
                    return json.load(f)
            except Exception:
                # Log error and fallback
                pass
        
        # Fallback to in-memory default
        normalized_type = doc_type.lower().replace(" ", "_").replace("&", "and")
        return self._defaults.get(normalized_type)

    def list_templates(self) -> List[Dict[str, Any]]:
        """
        Lists metadata for all available templates.
        """
        templates = []
        # Check files first
        for filepath in self.templates_dir.glob("*.json"):
            try:
                with open(filepath, "r") as f:
                    data = json.load(f)
                    templates.append({
                        "id": data.get("id"),
                        "name": data.get("name"),
                        "description": data.get("description"),
                        "required_variables": data.get("required_variables", []),
                        "recommended_clauses": data.get("recommended_clauses", [])
                    })
            except Exception:
                pass

        if not templates:
            # Fall back to defaults
            for key, val in self._defaults.items():
                templates.append({
                    "id": key,
                    "name": val.get("name"),
                    "description": val.get("description"),
                    "required_variables": val.get("required_variables", []),
                    "recommended_clauses": val.get("recommended_clauses", [])
                })
        return templates

    def register_template(self, doc_type: str, template_data: Dict[str, Any]) -> bool:
        """
        Registers/saves a new template.
        """
        filename = f"{doc_type.lower().replace(' ', '_')}.json"
        filepath = self.templates_dir / filename
        try:
            with open(filepath, "w") as f:
                json.dump(template_data, f, indent=2)
            return True
        except Exception:
            return False

    def _initialize_default_templates(self) -> None:
        """
        Populate templates folder if empty.
        """
        self._defaults: Dict[str, Dict[str, Any]] = {
            "nda": {
                "name": "Non-Disclosure Agreement (NDA)",
                "description": "Agreement to protect proprietary information shared during business discussions.",
                "required_variables": ["effective_date", "disclosing_party", "receiving_party", "purpose"],
                "recommended_clauses": ["confidentiality", "termination", "indemnity", "governing_law"],
                "boilerplate": (
                    "# MUTUAL NON-DISCLOSURE AGREEMENT\n\n"
                    "This Mutual Non-Disclosure Agreement (\"Agreement\") is entered into on {{effective_date}} "
                    "(\"Effective Date\") by and between:\n\n"
                    "1. {{disclosing_party}} (the \"Disclosing Party\") and\n"
                    "2. {{receiving_party}} (the \"Receiving Party\").\n\n"
                    "WHEREAS, the parties wish to evaluate a potential business relationship relating to {{purpose}} "
                    "(the \"Purpose\") and in connection with this, they may share proprietary and confidential information.\n\n"
                    "NOW, THEREFORE, the parties agree as follows:\n\n"
                    "## 1. CONFIDENTIAL INFORMATION\n"
                    "{{confidentiality}}\n\n"
                    "## 2. TERM AND TERMINATION\n"
                    "{{termination}}\n\n"
                    "## 3. INDEMNIFICATION\n"
                    "{{indemnity}}\n\n"
                    "## 4. GOVERNING LAW AND JURISDICTION\n"
                    "{{governing_law}}\n\n"
                    "## 5. GENERAL PROVISIONS\n"
                    "This Agreement constitutes the entire understanding between the parties. "
                    "No modification or amendment shall be binding unless in writing and signed by both parties."
                )
            },
            "employment_agreement": {
                "name": "Employment Agreement",
                "description": "Formal contract detailing terms of employment, compensation, and duties.",
                "required_variables": ["effective_date", "employer_name", "employee_name", "job_title", "salary"],
                "recommended_clauses": ["payment", "confidentiality", "termination", "governing_law"],
                "boilerplate": (
                    "# EMPLOYMENT CONTRACT\n\n"
                    "This Employment Contract (\"Agreement\") is executed on {{effective_date}} by and between:\n\n"
                    "1. {{employer_name}} (the \"Employer\"), and\n"
                    "2. {{employee_name}} (the \"Employee\").\n\n"
                    "The Employer desires to employ the Employee as a {{job_title}}, and the Employee accepts such employment under the following terms:\n\n"
                    "## 1. DUTIES AND RESPONSIBILITIES\n"
                    "The Employee shall perform all duties associated with the role of {{job_title}} and comply with company policies.\n\n"
                    "## 2. COMPENSATION AND BENEFITS\n"
                    "{{payment}}\n\n"
                    "## 3. CONFIDENTIALITY\n"
                    "{{confidentiality}}\n\n"
                    "## 4. TERM AND TERMINATION\n"
                    "{{termination}}\n\n"
                    "## 5. GOVERNING LAW\n"
                    "{{governing_law}}"
                )
            },
            "offer_letter": {
                "name": "Offer Letter",
                "description": "Formal job offer proposal listing key starting terms.",
                "required_variables": ["employer_name", "candidate_name", "job_title", "start_date", "salary"],
                "recommended_clauses": ["payment", "termination", "governing_law"],
                "boilerplate": (
                    "# JOB OFFER LETTER\n\n"
                    "Date: {{start_date}}\n\n"
                    "Dear {{candidate_name}},\n\n"
                    "On behalf of {{employer_name}}, we are pleased to offer you the position of {{job_title}}. "
                    "Below are the terms of our offer:\n\n"
                    "## 1. BASE SALARY\n"
                    "{{payment}}\n\n"
                    "## 2. TERMINATION CONDITIONS\n"
                    "{{termination}}\n\n"
                    "## 3. GOVERNING LAW\n"
                    "{{governing_law}}\n\n"
                    "Please sign below to signify your acceptance of this offer."
                )
            },
            "lease_agreement": {
                "name": "Lease Agreement",
                "description": "Rental contract between landlord and tenant outlining lease terms.",
                "required_variables": ["effective_date", "landlord_name", "tenant_name", "property_address", "monthly_rent"],
                "recommended_clauses": ["payment", "termination", "renewal", "governing_law"],
                "boilerplate": (
                    "# LEASE AGREEMENT\n\n"
                    "This Lease Agreement is made on {{effective_date}} by and between:\n\n"
                    "1. {{landlord_name}} (the \"Landlord\"), and\n"
                    "2. {{tenant_name}} (the \"Tenant\").\n\n"
                    "The Landlord leases to the Tenant the property located at {{property_address}} under the following conditions:\n\n"
                    "## 1. RENT AND DEPOSIT PAYMENT\n"
                    "{{payment}}\n\n"
                    "## 2. TERM AND RENEWAL\n"
                    "{{renewal}}\n\n"
                    "## 3. LEASE TERMINATION\n"
                    "{{termination}}\n\n"
                    "## 4. GOVERNING LAW\n"
                    "{{governing_law}}"
                )
            },
            "service_agreement": {
                "name": "Service Agreement",
                "description": "Agreement where one party provides services to another for consideration.",
                "required_variables": ["effective_date", "client_name", "service_provider", "scope_of_services", "fees"],
                "recommended_clauses": ["payment", "intellectual_property", "liability", "termination", "governing_law"],
                "boilerplate": (
                    "# SERVICE AGREEMENT\n\n"
                    "This Service Agreement is entered into on {{effective_date}} by and between:\n\n"
                    "1. {{client_name}} (the \"Client\"), and\n"
                    "2. {{service_provider}} (the \"Service Provider\").\n\n"
                    "WHEREAS, Client wishes to engage Service Provider to perform {{scope_of_services}};\n\n"
                    "## 1. SERVICE PAYMENT TERMS\n"
                    "{{payment}}\n\n"
                    "## 2. INTELLECTUAL PROPERTY RIGHTS\n"
                    "{{intellectual_property}}\n\n"
                    "## 3. LIMITATION OF LIABILITY\n"
                    "{{liability}}\n\n"
                    "## 4. TERM AND TERMINATION\n"
                    "{{termination}}\n\n"
                    "## 5. GOVERNING LAW AND RESOLUTION\n"
                    "{{governing_law}}"
                )
            },
            "partnership_agreement": {
                "name": "Partnership Agreement",
                "description": "Establishes a business partnership detailing shares, rules, and capital.",
                "required_variables": ["effective_date", "partner_1", "partner_2", "capital_contributions"],
                "recommended_clauses": ["payment", "termination", "arbitration", "governing_law"],
                "boilerplate": (
                    "# PARTNERSHIP AGREEMENT\n\n"
                    "This Partnership Agreement is executed on {{effective_date}} by and between:\n\n"
                    "1. {{partner_1}} and\n"
                    "2. {{partner_2}}.\n\n"
                    "The partners agree to establish a business partnership under the following terms:\n\n"
                    "## 1. CAPITAL AND PAYMENTS\n"
                    "{{payment}}\n\n"
                    "## 2. ARBITRATION AND DISPUTES\n"
                    "{{arbitration}}\n\n"
                    "## 3. TERMINATION AND DISSOLUTION\n"
                    "{{termination}}\n\n"
                    "## 4. GOVERNING LAW\n"
                    "{{governing_law}}"
                )
            },
            "vendor_agreement": {
                "name": "Vendor Agreement",
                "description": "Agreement defining commercial relationship between customer and vendor.",
                "required_variables": ["effective_date", "customer_name", "vendor_name", "goods_services"],
                "recommended_clauses": ["payment", "liability", "indemnity", "governing_law"],
                "boilerplate": (
                    "# VENDOR AGREEMENT\n\n"
                    "This Vendor Agreement is made on {{effective_date}} between:\n\n"
                    "1. {{customer_name}} (the \"Customer\"), and\n"
                    "2. {{vendor_name}} (the \"Vendor\").\n\n"
                    "Vendor shall provide {{goods_services}} under the following provisions:\n\n"
                    "## 1. SERVICES AND PAYMENTS\n"
                    "{{payment}}\n\n"
                    "## 2. LIMITATION OF LIABILITY\n"
                    "{{liability}}\n\n"
                    "## 3. INDEMNITY\n"
                    "{{indemnity}}\n\n"
                    "## 4. GOVERNING LAW\n"
                    "{{governing_law}}"
                )
            },
            "privacy_policy": {
                "name": "Privacy Policy",
                "description": "Legal statement disclosing data collection and privacy protocols.",
                "required_variables": ["effective_date", "website_url", "company_name"],
                "recommended_clauses": ["data_protection", "notice", "governing_law"],
                "boilerplate": (
                    "# PRIVACY POLICY\n\n"
                    "Last updated: {{effective_date}}\n\n"
                    "This Privacy Policy describes how {{company_name}} (\"we\", \"us\") collects and processes "
                    "your personal data when you visit {{website_url}}.\n\n"
                    "## 1. DATA COLLECTION AND PROTECTION\n"
                    "{{data_protection}}\n\n"
                    "## 2. NOTICES AND CONTACT\n"
                    "{{notice}}\n\n"
                    "## 3. GOVERNING LAW\n"
                    "{{governing_law}}"
                )
            },
            "terms_and_conditions": {
                "name": "Terms & Conditions",
                "description": "Governing rules for website, mobile application, or product usage.",
                "required_variables": ["effective_date", "website_url", "company_name"],
                "recommended_clauses": ["liability", "governing_law", "jurisdiction"],
                "boilerplate": (
                    "# TERMS AND CONDITIONS\n\n"
                    "Effective Date: {{effective_date}}\n\n"
                    "Welcome to {{website_url}}. These Terms and Conditions govern your use of the website operated by {{company_name}}.\n\n"
                    "## 1. LIMITATION OF LIABILITY\n"
                    "{{liability}}\n\n"
                    "## 2. GOVERNING LAW AND RESOLUTION\n"
                    "{{governing_law}}\n\n"
                    "## 3. JURISDICTION\n"
                    "{{jurisdiction}}"
                )
            },
            "legal_notice": {
                "name": "Legal Notice",
                "description": "Pre-litigation demand letter sent to initiate legal recourse.",
                "required_variables": ["issue_date", "sender_name", "recipient_name", "facts_of_case", "demands"],
                "recommended_clauses": ["notice", "governing_law", "jurisdiction"],
                "boilerplate": (
                    "# LEGAL DEMAND NOTICE\n\n"
                    "Date: {{issue_date}}\n\n"
                    "To,\n"
                    "{{recipient_name}}\n\n"
                    "Sir/Madam,\n\n"
                    "Under instructions of my client, {{sender_name}}, I hereby serve you with the following legal notice:\n\n"
                    "## 1. STATEMENT OF FACTS\n"
                    "{{facts_of_case}}\n\n"
                    "## 2. REQUISITIONAL DEMANDS\n"
                    "{{demands}}\n\n"
                    "## 3. NOTICE OF INTENTION\n"
                    "{{notice}}\n\n"
                    "## 4. GOVERNING LAW AND FORUM\n"
                    "{{governing_law}}\n\n"
                    "Yours sincerely,\n"
                    "Advocate"
                )
            },
            "reply_notice": {
                "name": "Reply Notice",
                "description": "Formal response answering allegations listed in a legal notice.",
                "required_variables": ["reply_date", "sender_name", "recipient_name", "allegations_responses"],
                "recommended_clauses": ["notice", "governing_law"],
                "boilerplate": (
                    "# REPLY TO LEGAL NOTICE\n\n"
                    "Date: {{reply_date}}\n\n"
                    "To,\n"
                    "{{recipient_name}}\n\n"
                    "Sir/Madam,\n\n"
                    "Under instructions of my client, {{sender_name}}, I hereby reply to your legal notice as follows:\n\n"
                    "## 1. RESPONSE TO ALLEGATIONS\n"
                    "{{allegations_responses}}\n\n"
                    "## 2. NOTICES AND COMMUNICATIONS\n"
                    "{{notice}}\n\n"
                    "## 3. GOVERNING LAW\n"
                    "{{governing_law}}"
                )
            },
            "affidavit": {
                "name": "Affidavit",
                "description": "Written statement confirmed by oath or affirmation for judicial use.",
                "required_variables": ["effective_date", "deponent_name", "deponent_address", "statements"],
                "recommended_clauses": ["jurisdiction", "governing_law"],
                "boilerplate": (
                    "# AFFIDAVIT\n\n"
                    "I, {{deponent_name}}, residing at {{deponent_address}}, do hereby solemnly affirm and state as follows on {{effective_date}}:\n\n"
                    "## 1. DEPONENT STATEMENTS\n"
                    "{{statements}}\n\n"
                    "## 2. VERIFICATION\n"
                    "I verify that the contents of this affidavit are true to the best of my knowledge.\n\n"
                    "DEPONENT\n"
                    "Signed and verified at {{jurisdiction}}."
                )
            },
            "memorandum_of_understanding": {
                "name": "Memorandum of Understanding (MoU)",
                "description": "Bilateral document describing intent to execute structured actions.",
                "required_variables": ["effective_date", "party_a", "party_b", "mutual_goals"],
                "recommended_clauses": ["confidentiality", "termination", "governing_law"],
                "boilerplate": (
                    "# MEMORANDUM OF UNDERSTANDING\n\n"
                    "This Memorandum of Understanding is entered into on {{effective_date}} between:\n\n"
                    "1. {{party_a}}, and\n"
                    "2. {{party_b}}.\n\n"
                    "Both parties seek to cooperate on achieving the following mutual goals: {{mutual_goals}}.\n\n"
                    "## 1. MUTUAL CONFIDENTIALITY\n"
                    "{{confidentiality}}\n\n"
                    "## 2. TERM AND TERMINATION\n"
                    "{{termination}}\n\n"
                    "## 3. GOVERNING LAW\n"
                    "{{governing_law}}"
                )
            },
            "general_contract": {
                "name": "General Contract",
                "description": "Standard multi-party legal agreement customized by clauses.",
                "required_variables": ["effective_date", "party_a", "party_b", "recitals"],
                "recommended_clauses": ["payment", "termination", "indemnity", "liability", "governing_law"],
                "boilerplate": (
                    "# GENERAL AGREEMENT\n\n"
                    "This Agreement is executed on {{effective_date}} by and between:\n\n"
                    "1. {{party_a}}, and\n"
                    "2. {{party_b}}.\n\n"
                    "WHEREAS, the parties desire to form this contract based on {{recitals}};\n\n"
                    "## 1. COMMERCIALS AND PAYMENTS\n"
                    "{{payment}}\n\n"
                    "## 2. TERMINATION AND REMEDY\n"
                    "{{termination}}\n\n"
                    "## 3. LIABILITY LIMITS\n"
                    "{{liability}}\n\n"
                    "## 4. GOVERNING LAW\n"
                    "{{governing_law}}"
                )
            }
        }

        # Initialize JSON files if directory is empty
        if not any(self.templates_dir.glob("*.json")):
            for key, val in self._defaults.items():
                self.register_template(key, val)

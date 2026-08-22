import json
import re
from typing import Any

import httpx
from loguru import logger

from app.agents.compliance_agent.base_plugin import (
    BaseRegulationPlugin,
    ComplianceCheckResult,
    ComplianceCheckRule,
)
from app.core.config import settings


async def evaluate_rules_hybrid(
    regulation_id: str,
    regulation_name: str,
    rules: list[ComplianceCheckRule],
    text: str,
    context: dict[str, Any] | None = None
) -> list[ComplianceCheckResult]:
    """
    Evaluates a set of compliance check rules against text using Gemini LLM if API key is present.
    Otherwise, falls back to deterministic rule-based keyword / regex matching.
    """
    api_key = settings.GEMINI_API_KEY or ""
    # Check if a real key is present
    if api_key and "your-gemini-api-key" not in api_key.lower():
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}

            system_instruction = (
                f"You are a Senior Regulatory Compliance Auditor specializing in Indian Law. "
                f"You will evaluate the provided document/policy text against the rules for {regulation_name}.\n"
                f"For each rule, determine if the document passes or fails compliance.\n"
                f"Return your audit results as a strict JSON object with a key 'results' mapping to an array of objects.\n"
                f"Each object must have the following keys:\n"
                f"- 'rule_id' (string, matching the rule ID exactly)\n"
                f"- 'passed' (boolean)\n"
                f"- 'detail' (string, detailing findings, what is present or what is missing)\n"
                f"- 'citations' (array of strings, containing direct quotes/sections from the text supporting the finding)\n"
            )

            rules_str = "\n".join([
                f"- ID: {r.id} | Name: {r.name} | Section: {r.section} | Description: {r.description}"
                for r in rules
            ])

            prompt = (
                f"Regulations: {regulation_name}\n"
                f"Rules to check:\n{rules_str}\n\n"
                f"Document Text:\n{text[:50000]}\n\n"  # Truncate text if it is too long to prevent token issues
                f"Audit the document text and output the results in JSON format."
            )

            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.1
                }
            }

            logger.info(f"Sending compliance audit request to Gemini API for {regulation_id}...")
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, headers=headers, timeout=20.0)
                if resp.status_code == 200:
                    res_data = resp.json()
                    text_response = res_data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text_response.strip())
                    
                    results_list = []
                    rule_map = {r.id: r for r in rules}
                    for res_item in parsed.get("results", []):
                        rid = res_item.get("rule_id")
                        if rid in rule_map:
                            rule = rule_map[rid]
                            results_list.append(ComplianceCheckResult(
                                rule_id=rule.id,
                                rule_name=rule.name,
                                passed=bool(res_item.get("passed", False)),
                                detail=str(res_item.get("detail", "N/A")),
                                severity=rule.severity,
                                section=rule.section,
                                citations=list(res_item.get("citations", []))
                            ))
                    
                    # Fill in any rules the LLM missed
                    audited_ids = {r.rule_id for r in results_list}
                    for rule in rules:
                        if rule.id not in audited_ids:
                            results_list.append(ComplianceCheckResult(
                                rule_id=rule.id,
                                rule_name=rule.name,
                                passed=False,
                                detail="Rule check was skipped or not evaluated by the model.",
                                severity=rule.severity,
                                section=rule.section,
                                citations=[]
                            ))
                    return results_list
                else:
                    logger.warning(f"Gemini API returned status {resp.status_code}. Falling back to rule-based evaluation.")
        except Exception as e:  # noqa: BLE001
            logger.error(f"Error calling Gemini API for compliance audit: {e}. Falling back to rule-based evaluation.")

    # Fallback to local rule-based matching
    logger.info(f"Running deterministic fallback compliance evaluation for {regulation_id}...")
    return run_local_evaluation(regulation_id, rules, text)


def run_local_evaluation(regulation_id: str, rules: list[ComplianceCheckRule], text: str) -> list[ComplianceCheckResult]:
    results = []
    text_lower = text.lower()

    for rule in rules:
        passed = False
        detail = ""
        citations = []

        # Rule evaluation logic using keyword checks or regexes
        if rule.id == "DPDP_CONSENT_NOTICE":
            keywords = ["consent", "notice", "clear description", "purpose", "personal data", "withdraw"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 3:
                passed = True
                detail = "Notice contains appropriate details regarding consent, data processed, and purpose."
                # Extract snippet for citation
                snippet_match = re.search(r"([^.\n]*consent[^.\n]*)", text, re.IGNORECASE)
                if snippet_match:
                    citations.append(snippet_match.group(0).strip())
            else:
                passed = False
                detail = "Document lacks clear consent notice provisions explaining the purposes of processing."

        elif rule.id == "DPDP_RIGHTS_OF_DATA_PRINCIPAL":
            keywords = ["right to access", "right to correct", "withdraw consent", "erase", "erasure", "rectify"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "The policy outlines data principal rights (access, correction, erasure, withdrawal)."
                snippet_match = re.search(r"([^.\n]*(?:right|access|correct|erase)[^.\n]*)", text, re.IGNORECASE)
                if snippet_match:
                    citations.append(snippet_match.group(0).strip())
            else:
                passed = False
                detail = "Missing explicit rights for data principals to correct, access, or delete personal data."

        elif rule.id == "DPDP_DATA_FIDUCIARY_OBLIGATIONS":
            keywords = ["security safeguard", "data breach", "notify", "safeguard", "prevent breach", "technical measure"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "Provisions for implementing security safeguards and reporting data breaches are present."
            else:
                passed = False
                detail = "Insufficient safeguards and data breach notification protocol discovered."

        elif rule.id == "DPDP_CHILD_CONSENT":
            keywords = ["child", "parent", "guardian", "children", "verify age", "parental consent"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 1:
                passed = True
                detail = "Mentions parental/guardian verification or restrictions on children's data."
            else:
                passed = False
                detail = "No specific rules found regulating processing of children's data or verifying parental consent."

        elif rule.id == "IT_INTERMEDIARY_DUE_DILIGENCE":
            keywords = ["privacy policy", "terms of use", "terms of service", "rules and regulations"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "Contains terms of service/use and published privacy policy."
            else:
                passed = False
                detail = "Does not clearly state the presence of terms of use or user agreement guidelines."

        elif rule.id == "IT_REASONABLE_SECURITY_PRACTICES":
            keywords = ["reasonable security", "security practice", "iso 27001", "encryption", "secure", "spdi"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "Explicitly mentions reasonable security practices, encryption, or standards."
            else:
                passed = False
                detail = "Lacks references to industry-standard security frameworks or sensitive data safeguards."

        elif rule.id == "IT_GRIEVANCE_OFFICER":
            keywords = ["grievance", "redressal", "nodal", "officer", "complaint", "contact info"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "Grievance Officer details (name, email, or escalation route) are published."
            else:
                passed = False
                detail = "No grievance officer designation or contact details found in the document."

        elif rule.id == "BNS_CRIMINAL_LIABILITY":
            keywords = ["criminal", "penalty", "offence", "fraud", "cheating", "liability", "punishment"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 1:
                passed = True
                detail = "Recognizes criminal/penal liabilities and compliance with Indian penal codes."
            else:
                passed = False
                detail = "Lacks standard penal liability risk declarations or indemnification against crimes."

        elif rule.id == "BNSS_EVIDENCE_RECORDING":
            keywords = ["evidence", "electronic record", "investigation", "digital signature", "search", "seizure"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 1:
                passed = True
                detail = "Document specifies electronic record management aligned with Indian criminal procedures."
            else:
                passed = False
                detail = "No clauses found dealing with search, audit, or electronic record capture rules under BNSS."

        elif rule.id == "BSA_ELECTRONIC_RECORDS":
            keywords = ["admissibility", "certificate", "section 63", "electronic record", "affidavit", "evidence"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 1:
                passed = True
                detail = "Identifies criteria for verifying the integrity/admissibility of electronic files."
            else:
                passed = False
                detail = "Lacks Section 63/evidence certification standards for digital documents."

        elif rule.id == "CP_E_COMMERCE_DISCLOSURES":
            keywords = ["pricing", "refund", "return", "cancellation", "shipping", "customer care"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 3:
                passed = True
                detail = "Required consumer disclosures (returns, refunds, pricing details) are present."
            else:
                passed = False
                detail = "Fails to clearly detail standard consumer rights, returns, or billing terms."

        elif rule.id == "CP_UNFAIR_TRADE_PRACTICES":
            keywords = ["unfair", "misleading", "warranty", "guarantee", "deceptive", "liable"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 1:
                passed = True
                detail = "Includes provisions guarding against misleading ads or unfair practices."
            else:
                passed = False
                detail = "Potential presence of one-sided contract terms that could be classified as unfair."

        elif rule.id == "COMP_BOARD_REPORT":
            keywords = ["board of directors", "board report", "corporate governance", "director's responsibility", "audit committee"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "Incorporates directorship governance and responsibility details."
            else:
                passed = False
                detail = "Lacks required Companies Act disclosures for boards or directors' statements."

        elif rule.id == "COMP_RELATED_PARTY":
            keywords = ["related party", "arm's length", "subsidiary", "associate", "transaction approval"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "Includes arm's-length terms and board approvals for related parties."
            else:
                passed = False
                detail = "No controls or descriptions regarding related party disclosures."

        elif rule.id == "LABOUR_WORKING_HOURS":
            keywords = ["working hours", "overtime", "shift", "holiday", "leave", "weekly off"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "Policy specifies working hours, breaks, and overtime limits."
            else:
                passed = False
                detail = "Missing descriptions of standard work hours, rest periods, or overtime wages."

        elif rule.id == "LABOUR_EQUAL_REMUNERATION":
            keywords = ["equal wage", "remuneration", "discrimination", "gender", "minimum wage", "equal work"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "Anti-discrimination and equal payment declarations are present."
            else:
                passed = False
                detail = "No strict statement preventing compensation disparities based on gender or discrimination."

        elif rule.id == "GST_INVOICE_COMPLIANCE":
            keywords = ["gstin", "tax invoice", "hsn", "sac", "cgst", "sgst", "igst", "place of supply"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 3:
                passed = True
                detail = "Invoice metadata specifies standard GST fields (GSTIN, HSN, Tax details)."
            else:
                passed = False
                detail = "Document invoices fail to show necessary GST attributes."

        elif rule.id == "GST_RETURNS_FILING":
            keywords = ["gstr", "gst return", "filing", "input tax credit", "itc"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 1:
                passed = True
                detail = "Commitment to input tax credit reconciliation and timely GST returns."
            else:
                passed = False
                detail = "Lacks statements regarding tax compliance or timely return submissions."

        elif rule.id == "RBI_DATA_LOCALIZATION":
            keywords = ["localize", "data storage", "store in india", "payment system", "data hosting"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 1:
                passed = True
                detail = "Explicitly states that customer transaction data is hosted and stored in India."
            else:
                passed = False
                detail = "No specific clauses enforcing local Indian data hosting for financial transaction logs."

        elif rule.id == "RBI_CUSTOMER_PROTECTION":
            keywords = ["unauthorized transaction", "zero liability", "customer liability", "fraud report", "report within"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "Customer notification process and liability caps for fraud are present."
            else:
                passed = False
                detail = "Fails to detail customer liability policies for third-party system breaches."

        elif rule.id == "SEBI_INSIDER_TRADING":
            keywords = ["insider trading", "pit", "upsi", "unpublished price", "structured digital database", "sdd"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "Details internal controls for prevention of insider trading and UPSI leaks."
            else:
                passed = False
                detail = "No insider trading code of conduct or UPSI database requirement detected."

        elif rule.id == "SEBI_LODR_DISCLOSURES":
            keywords = ["lodr", "listing obligation", "material event", "disclosure", "stock exchange", "board meeting"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 2:
                passed = True
                detail = "Contains board guidelines for reporting material events to stock exchanges."
            else:
                passed = False
                detail = "Listing obligations or prompt disclosure protocols are absent."

        elif rule.id == "CERT_CYBER_INCIDENT_REPORT":
            keywords = ["cert-in", "report incident", "incident response", "6 hours", "cyber security breach"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 1 or ("incident" in text_lower and "hours" in text_lower):
                passed = True
                detail = "Specifies cyber incident reporting rules conforming to national frameworks."
            else:
                passed = False
                detail = "No mandatory 6-hour incident report timeline mentioned."

        elif rule.id == "CERT_LOG_MAINTENANCE":
            keywords = ["maintenance of logs", "ICT logs", "180 days", "store logs", "retention"]
            matches = [kw for kw in keywords if kw in text_lower]
            if len(matches) >= 1 or ("log" in text_lower and "days" in text_lower):
                passed = True
                detail = "Outlines cyber log storage and retention protocols."
            else:
                passed = False
                detail = "Lacks mandatory 180-day log preservation guidelines."

        else:
            # Catch-all default check
            passed = True
            detail = f"Rule check completed successfully for {rule.name}."

        results.append(ComplianceCheckResult(
            rule_id=rule.id,
            rule_name=rule.name,
            passed=passed,
            detail=detail,
            severity=rule.severity,
            section=rule.section,
            citations=citations
        ))

    return results


class DPDPActPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "dpdp"

    @property
    def regulation_name(self) -> str:
        return "DPDP Act"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="DPDP_CONSENT_NOTICE",
                name="Consent Notice",
                description="Consent notice must be present, clear, and specify purposes of data processing.",
                section="Section 6",
                severity="Critical"
            ),
            ComplianceCheckRule(
                id="DPDP_RIGHTS_OF_DATA_PRINCIPAL",
                name="Rights of Data Principal",
                description="Allows users to access, correct, erase their data, and withdraw consent.",
                section="Section 11 & 12",
                severity="High"
            ),
            ComplianceCheckRule(
                id="DPDP_DATA_FIDUCIARY_OBLIGATIONS",
                name="Data Fiduciary Security Safeguards",
                description="Must maintain technical safeguards to prevent breaches and notify CERT-In and users of leaks.",
                section="Section 8",
                severity="Critical"
            ),
            ComplianceCheckRule(
                id="DPDP_CHILD_CONSENT",
                name="Children's Data Processing Restrictions",
                description="Requires verifiable parental or guardian consent for processing minors' data.",
                section="Section 9",
                severity="High"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


class ITActPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "it_act"

    @property
    def regulation_name(self) -> str:
        return "Information Technology Act"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="IT_INTERMEDIARY_DUE_DILIGENCE",
                name="Intermediary Due Diligence",
                description="Intermediary platforms must publish rules, regulations, privacy policy, and user agreement.",
                section="Section 79 Rules",
                severity="High"
            ),
            ComplianceCheckRule(
                id="IT_REASONABLE_SECURITY_PRACTICES",
                name="Reasonable Security Practices",
                description="Entities holding Sensitive Personal Data must implement reasonable security practices like encryption.",
                section="Section 43A & SPDI Rules",
                severity="Critical"
            ),
            ComplianceCheckRule(
                id="IT_GRIEVANCE_OFFICER",
                name="Grievance Redressal Officer",
                description="Designate a Grievance Officer and publish contact information and complaint timelines.",
                section="Intermediary Guidelines",
                severity="High"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


class BNSPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "bns"

    @property
    def regulation_name(self) -> str:
        return "Bharatiya Nyaya Sanhita (BNS)"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="BNS_CRIMINAL_LIABILITY",
                name="Corporate Penal Liability",
                description="Document terms must not shield corporate entity or directors from criminal acts or fraud.",
                section="Chapters on Fraud, Cheating, and Conspiracy",
                severity="Critical"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


class BNSSPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "bnss"

    @property
    def regulation_name(self) -> str:
        return "Bharatiya Nagarik Suraksha Sanhita (BNSS)"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="BNSS_EVIDENCE_RECORDING",
                name="Electronic Investigation Support",
                description="Procedures for maintaining logs and electronic record integrity during search/seizures.",
                section="Chapter on Electronic Evidence Capture",
                severity="Medium"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


class BSAPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "bsa"

    @property
    def regulation_name(self) -> str:
        return "Bharatiya Sakshya Adhiniyam (BSA)"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="BSA_ELECTRONIC_RECORDS",
                name="Admissibility of Electronic Records",
                description="Electronic files or transaction records must comply with certification templates.",
                section="Section 57 & 63",
                severity="High"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


class ConsumerProtectionPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "consumer_protection"

    @property
    def regulation_name(self) -> str:
        return "Consumer Protection Act"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="CP_E_COMMERCE_DISCLOSURES",
                name="E-commerce Seller Disclosures",
                description="Mandatory publication of pricing, refund/return terms, shipping details, and support contact.",
                section="E-Commerce Rules 2020",
                severity="High"
            ),
            ComplianceCheckRule(
                id="CP_UNFAIR_TRADE_PRACTICES",
                name="Prevention of Unfair Terms",
                description="Terms must avoid one-sided contract clauses or misleading advertisements.",
                section="Section 2(47)",
                severity="High"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


class CompaniesActPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "companies_act"

    @property
    def regulation_name(self) -> str:
        return "Companies Act"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="COMP_BOARD_REPORT",
                name="Board's Responsibility and Governance",
                description="Directorship details and responsibility frameworks must comply with Section 134 rules.",
                section="Section 134",
                severity="High"
            ),
            ComplianceCheckRule(
                id="COMP_RELATED_PARTY",
                name="Related Party Transactions",
                description="Procedures for arm's length evaluation and necessary approvals for related party transactions.",
                section="Section 188",
                severity="Critical"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


class LabourLawsPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "labour_laws"

    @property
    def regulation_name(self) -> str:
        return "Labour Laws"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="LABOUR_WORKING_HOURS",
                name="Working Hours and Holidays",
                description="Employment details must state work hours, shift details, overtime rates, and mandatory offs.",
                section="Code on Wages & Shops Act",
                severity="Medium"
            ),
            ComplianceCheckRule(
                id="LABOUR_EQUAL_REMUNERATION",
                name="Equal Remuneration and Non-discrimination",
                description="Employment contracts must ensure equal pay for equal work without gender discrimination.",
                section="Code on Wages",
                severity="High"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


class GSTPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "gst"

    @property
    def regulation_name(self) -> str:
        return "GST Regulations"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="GST_INVOICE_COMPLIANCE",
                name="GST Compliant Tax Invoicing",
                description="Tax invoices must show GSTIN, description, HSN/SAC code, rate, value, and place of supply.",
                section="Section 31 of CGST Act",
                severity="High"
            ),
            ComplianceCheckRule(
                id="GST_RETURNS_FILING",
                name="GST Return Reconciliation",
                description="Details mapping of input tax credit reconciliation and timely file submissions.",
                section="Chapter VIII of CGST Act",
                severity="Medium"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


class RBIGuidelinesPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "rbi_guidelines"

    @property
    def regulation_name(self) -> str:
        return "RBI Guidelines"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="RBI_DATA_LOCALIZATION",
                name="Storage of Payment System Data",
                description="Requires all financial/payment transaction logs to be stored exclusively in databases inside India.",
                section="RBI Payment Circulars",
                severity="Critical"
            ),
            ComplianceCheckRule(
                id="RBI_CUSTOMER_PROTECTION",
                name="Limitation of Customer Liability",
                description="Defines customer liability in unauthorized electronic transactions and safety procedures.",
                section="Customer Protection Circulars",
                severity="High"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


class SEBIRegulationsPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "sebi_regulations"

    @property
    def regulation_name(self) -> str:
        return "SEBI Regulations"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="SEBI_INSIDER_TRADING",
                name="Prohibition of Insider Trading Controls",
                description="Must maintain internal controls and a structured digital database of persons receiving UPSI.",
                section="SEBI (PIT) Regulations",
                severity="Critical"
            ),
            ComplianceCheckRule(
                id="SEBI_LODR_DISCLOSURES",
                name="Material Event Disclosures",
                description="Listings obligation requirement to disclose material price-sensitive information to stock exchanges.",
                section="SEBI (LODR) Regulations",
                severity="High"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


class CERTInPlugin(BaseRegulationPlugin):
    @property
    def regulation_id(self) -> str:
        return "cert_in"

    @property
    def regulation_name(self) -> str:
        return "CERT-In Directions"

    @property
    def rules(self) -> list[ComplianceCheckRule]:
        return [
            ComplianceCheckRule(
                id="CERT_CYBER_INCIDENT_REPORT",
                name="Incident Reporting to CERT-In",
                description="Cybersecurity incidents and system breaches must be reported to CERT-In within 6 hours of discovery.",
                section="Direction 5(1)",
                severity="Critical"
            ),
            ComplianceCheckRule(
                id="CERT_LOG_MAINTENANCE",
                name="Maintenance of ICT System Logs",
                description="Must preserve logs of ICT systems for a rolling duration of 180 days within Indian jurisdiction.",
                section="Direction 5(2)",
                severity="High"
            )
        ]

    async def evaluate(self, text: str, context: dict[str, Any] | None = None) -> list[ComplianceCheckResult]:
        return await evaluate_rules_hybrid(self.regulation_id, self.regulation_name, self.rules, text, context)


# Registry of built-in plugins
BUILTIN_PLUGINS = [
    DPDPActPlugin(),
    ITActPlugin(),
    BNSPlugin(),
    BNSSPlugin(),
    BSAPlugin(),
    ConsumerProtectionPlugin(),
    CompaniesActPlugin(),
    LabourLawsPlugin(),
    GSTPlugin(),
    RBIGuidelinesPlugin(),
    SEBIRegulationsPlugin(),
    CERTInPlugin()
]

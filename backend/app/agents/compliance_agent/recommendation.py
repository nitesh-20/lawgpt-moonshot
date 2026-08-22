from typing import Any, ClassVar

from app.agents.compliance_agent.base_plugin import ComplianceCheckResult


class RecommendationEngine:
    """
    Translates failed compliance checks and gaps into actionable corrective actions,
    attaching legal references and severity-based prioritization.
    """
    RECOMMENDATION_DATABASE: ClassVar[dict[str, dict[str, str]]] = {
        "DPDP_CONSENT_NOTICE": {
            "action": "Draft and display a clear, plain-language consent notice detailing categories of personal data collected, specific purposes of processing, and instructions on how users can withdraw consent.",
            "reference": "Section 6 of the Digital Personal Data Protection (DPDP) Act, 2023"
        },
        "DPDP_RIGHTS_OF_DATA_PRINCIPAL": {
            "action": "Establish data principal request workflows (DSAR) enabling users to easily request access to, correction of, or erasure of their personal data.",
            "reference": "Section 11 & 12 of the Digital Personal Data Protection (DPDP) Act, 2023"
        },
        "DPDP_DATA_FIDUCIARY_OBLIGATIONS": {
            "action": "Draft a data breach response policy and institute technical security safeguards like access controls, monitoring, and audit logs. Establish a procedure to report leaks to CERT-In and users.",
            "reference": "Section 8 of the Digital Personal Data Protection (DPDP) Act, 2023"
        },
        "DPDP_CHILD_CONSENT": {
            "action": "Implement age-gating mechanisms or require explicit, verifiable parental/guardian consent before collecting or processing any personal data of children under 18.",
            "reference": "Section 9 of the Digital Personal Data Protection (DPDP) Act, 2023"
        },
        "IT_INTERMEDIARY_DUE_DILIGENCE": {
            "action": "Publish updated User Agreements, Terms of Service, and a compliant Privacy Policy prominently on the website/app footer.",
            "reference": "Section 79 of the Information Technology Act & Intermediary Rules"
        },
        "IT_REASONABLE_SECURITY_PRACTICES": {
            "action": "Implement reasonable security standards (e.g., encryption of sensitive data in transit and at rest, regular penetration testing, ISO 27001 certification).",
            "reference": "Section 43A of the Information Technology Act & SPDI Rules"
        },
        "IT_GRIEVANCE_OFFICER": {
            "action": "Designate a Grievance Officer, publish their name and email on the platform, and define a clear escalation mechanism resolving user complaints.",
            "reference": "Information Technology Intermediary Rules"
        },
        "BNS_CRIMINAL_LIABILITY": {
            "action": "Refrain from drafting clauses that attempt to shield corporate executives from penal offences or corporate fraud.",
            "reference": "Chapters on Fraud, Cheating and Conspiracy, Bharatiya Nyaya Sanhita (BNS)"
        },
        "BNSS_EVIDENCE_RECORDING": {
            "action": "Set up chain of custody controls and record preservation protocols during digital investigations.",
            "reference": "Chapters on Search & Seizure, Bharatiya Nagarik Suraksha Sanhita (BNSS)"
        },
        "BSA_ELECTRONIC_RECORDS": {
            "action": "Maintain digital signatures or validation certificates for electronic records to guarantee court admissibility.",
            "reference": "Section 63 of Bharatiya Sakshya Adhiniyam (BSA), 2023"
        },
        "CP_E_COMMERCE_DISCLOSURES": {
            "action": "Add mandatory disclosures on refund/return windows, pricing components, customer care contacts, and merchant details on the check-out page.",
            "reference": "E-Commerce Rules, 2020 under Consumer Protection Act"
        },
        "CP_UNFAIR_TRADE_PRACTICES": {
            "action": "Modify one-sided contract clauses (like unlimited liabilities or waiver of warranties) to prevent accusations of unfair trade practices.",
            "reference": "Section 2(47) of the Consumer Protection Act, 2019"
        },
        "COMP_BOARD_REPORT": {
            "action": "Draft the annual Board's Responsibility Statement in compliance with Section 134 rules.",
            "reference": "Section 134 of the Companies Act, 2013"
        },
        "COMP_RELATED_PARTY": {
            "action": "Draft a policy on Related Party Transactions and ensure all transactions are on an arm's-length basis with Audit Committee approvals.",
            "reference": "Section 188 of the Companies Act, 2013"
        },
        "LABOUR_WORKING_HOURS": {
            "action": "Incorporate standard working hours (max 9 hours a day, 48 hours a week), overtime rates, and weekly holiday terms in employment templates.",
            "reference": "Code on Wages & local Shops & Establishments Act"
        },
        "LABOUR_EQUAL_REMUNERATION": {
            "action": "Formulate a policy ensuring gender-neutral remuneration structures for identical roles.",
            "reference": "Code on Wages, 2019"
        },
        "GST_INVOICE_COMPLIANCE": {
            "action": "Configure billing systems to output tax invoices specifying GSTIN, HSN codes, supply locations, and exact tax breakdowns (CGST/SGST/IGST).",
            "reference": "Section 31 of the CGST Act, 2017"
        },
        "GST_RETURNS_FILING": {
            "action": "Establish monthly GSTR reconciliation checks to avoid input tax credit mismatch penalties.",
            "reference": "Chapter VIII of the CGST Act, 2017"
        },
        "RBI_DATA_LOCALIZATION": {
            "action": "Verify that payment transaction pipelines, authorization details, and ledger backups are hosted exclusively in databases in Indian data centers.",
            "reference": "RBI Storage of Payment System Data Circular"
        },
        "RBI_CUSTOMER_PROTECTION": {
            "action": "Publish zero-liability policies for unauthorized transactions and set up 24/7 channels for customers to report card/banking fraud.",
            "reference": "RBI Customer Protection Guidelines"
        },
        "SEBI_INSIDER_TRADING": {
            "action": "Deploy a Structured Digital Database (SDD) to log all insider metadata and secure UPSI sharing transactions.",
            "reference": "SEBI (Prohibition of Insider Trading) Regulations"
        },
        "SEBI_LODR_DISCLOSURES": {
            "action": "Establish listing compliance calendars and standard operations for disclosing price-sensitive material events to the stock exchanges.",
            "reference": "SEBI (LODR) Regulations"
        },
        "CERT_CYBER_INCIDENT_REPORT": {
            "action": "Formulate incident response playbooks establishing cyber breach detection and reporting to CERT-In within 6 hours.",
            "reference": "CERT-In directions under IT Act"
        },
        "CERT_LOG_MAINTENANCE": {
            "action": "Configure system audit servers to preserve system logs for a minimum duration of 180 days.",
            "reference": "CERT-In directions under IT Act"
        }
    }

    async def generate_recommendations(
        self, failed_checks: list[ComplianceCheckResult]
    ) -> list[dict[str, Any]]:
        """
        Maps failed compliance checks to specific actions and legal citations.
        """
        recommendations = []

        for idx, check in enumerate(failed_checks, 1):
            rule_id = check.rule_id
            rule_info = self.RECOMMENDATION_DATABASE.get(rule_id, {
                "action": f"Resolve compliance check gap for rule: {check.rule_name}.",
                "reference": f"Section reference: {check.section}"
            })

            recommendations.append({
                "id": f"REC_{idx:03d}",
                "rule_id": rule_id,
                "rule_name": check.rule_name,
                "severity": check.severity,
                "regulatory_section": check.section,
                "recommended_action": rule_info["action"],
                "legal_reference": rule_info["reference"],
                "findings": check.detail
            })

        # Sort by severity priority (Critical -> High -> Medium -> Low)
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        recommendations.sort(key=lambda x: priority_order.get(x["severity"].lower(), 99))

        return recommendations

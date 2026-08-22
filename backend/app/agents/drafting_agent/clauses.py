from typing import Any, Dict, List


class ClauseLibrary:
    """
    Standard catalog of reusable legal clauses with multiple variations
    and plain-English explanations.
    """
    def __init__(self) -> None:
        self._library: Dict[str, Dict[str, Any]] = {
            "confidentiality": {
                "name": "Confidentiality",
                "description": "Protects proprietary and confidential information disclosed during the relationship.",
                "variations": {
                    "standard": (
                        "The Receiving Party agrees to maintain the confidentiality of all proprietary information "
                        "disclosed by the Disclosing Party. The Receiving Party shall use at least the same degree of care "
                        "to protect the Confidential Information as it uses for its own confidential info (but no less than reasonable care), "
                        "and shall not disclose the Confidential Information to any third party without prior written consent."
                    ),
                    "strict": (
                        "The Receiving Party shall hold all Confidential Information in the absolute strictest confidence. "
                        "Under no circumstances shall the Receiving Party disclose any portion of the Confidential Information "
                        "to any employee, contractor, or representative unless they have signed a direct confidentiality covenant "
                        "no less restrictive than this Agreement. The Receiving Party shall defend, indemnify, and hold harmless "
                        "the Disclosing Party for any breach of this section."
                    ),
                    "mutual": (
                        "Each party agrees to hold in confidence all confidential and proprietary information received from "
                        "the other party. Neither party shall disclose or use the other party's confidential information for any "
                        "purpose outside the scope of this Agreement, except with the disclosing party's prior written consent."
                    )
                },
                "explanations": {
                    "standard": "The receiving party agrees to treat your secrets with reasonable care and not share them without consent.",
                    "strict": "The receiving party must keep secrets under lock and key, with strict limits on who sees them, and is financially responsible if they leak.",
                    "mutual": "Both parties promise to protect each other's secrets equally."
                }
            },
            "termination": {
                "name": "Termination",
                "description": "Defines how the agreement can be ended and notice requirements.",
                "variations": {
                    "standard": (
                        "Either party may terminate this Agreement for convenience upon thirty (30) days' prior written notice "
                        "to the other party. Either party may terminate immediately if the other party breaches a material provision "
                        "and fails to cure such breach within fifteen (15) days of notice."
                    ),
                    "strict": (
                        "The Company may terminate this Agreement immediately for cause, or for convenience upon ninety (90) days' "
                        "prior written notice. The Counterparty has no right to terminate for convenience, and may only terminate "
                        "for a material breach by the Company that remains uncured for sixty (60) days after formal written notice."
                    ),
                    "mutual": (
                        "This Agreement may be terminated by mutual written consent of both parties at any time. Alternatively, "
                        "either party may terminate this Agreement by providing sixty (60) days' prior written notice to the other party."
                    )
                },
                "explanations": {
                    "standard": "Either side can end the contract for any reason with 30 days' notice, or immediately if a breach is not fixed in 15 days.",
                    "strict": "Only one party has the flexibility to terminate easily, while the other faces strict hurdles to exit.",
                    "mutual": "Both sides must agree to end the contract, or give a 60-day notice."
                }
            },
            "force_majeure": {
                "name": "Force Majeure",
                "description": "Excuses performance due to events beyond a party's reasonable control.",
                "variations": {
                    "standard": (
                        "Neither party shall be liable for any delay or failure in performance under this Agreement due to acts of God, "
                        "war, riot, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of "
                        "transportation facilities, fuel, energy, labor, or materials, provided that the affected party gives prompt notice."
                    ),
                    "strict": (
                        "A party claiming force majeure shall only be excused from performance if the event is a direct act of God "
                        "or national military war, completely unforeseeable, and impossible to mitigate. Financial hardship, labor strikes "
                        "affecting subcontractors, or market fluctuations shall never constitute a Force Majeure event. Affected party must "
                        "notify the other party within twenty-four (24) hours."
                    )
                },
                "explanations": {
                    "standard": "Neither side is blamed for delays caused by major external disasters, wars, or acts of God, as long as they warn the other side.",
                    "strict": "Excuses performance only under extreme, literal acts of God and excludes business issues like strikes or lack of funds."
                }
            },
            "indemnity": {
                "name": "Indemnity",
                "description": "Defines who pays for legal costs and losses resulting from breaches or third-party claims.",
                "variations": {
                    "standard": (
                        "Each party agrees to indemnify, defend, and hold harmless the other party from and against any third-party "
                        "claims, liabilities, damages, and expenses (including reasonable attorneys' fees) arising out of the indemnifying "
                        "party's gross negligence, willful misconduct, or material breach of this Agreement."
                    ),
                    "strict": (
                        "The Counterparty shall defend, indemnify, and hold harmless the Company, its affiliates, directors, officers, "
                        "and employees from and against any and all claims, actions, suits, losses, liabilities, damages, costs, and expenses "
                        "(including attorney fees) arising from any breach of this Agreement, non-compliance with law, or alleged infringement "
                        "of intellectual property rights by the Counterparty."
                    )
                },
                "explanations": {
                    "standard": "Each party pays for the damages they cause to the other side through neglect or contract violation.",
                    "strict": "The counterparty is fully responsible for defending you and paying all costs for any lawsuits or losses arising from their work."
                }
            },
            "jurisdiction": {
                "name": "Jurisdiction",
                "description": "Specifies the courts that have the authority to hear disputes.",
                "variations": {
                    "standard": (
                        "Any legal suit, action, or proceeding arising out of or related to this Agreement shall be instituted exclusively "
                        "in the courts located in New Delhi, India, and each party irrevocably submits to the exclusive jurisdiction of such courts."
                    ),
                    "strict": (
                        "The Counterparty irrevocably consents to the sole and exclusive jurisdiction of the courts located in "
                        "Mumbai, India for any lawsuit. The Counterparty waives any objection based on inconvenient forum or lack of personal jurisdiction."
                    )
                },
                "explanations": {
                    "standard": "If there's a lawsuit, it must be filed in the courts of New Delhi.",
                    "strict": "All lawsuits must happen in Mumbai, and the counterparty cannot complain about the location."
                }
            },
            "arbitration": {
                "name": "Arbitration",
                "description": "Defines how disputes are resolved out-of-court via arbitration.",
                "variations": {
                    "standard": (
                        "Any dispute arising out of or in connection with this contract shall be referred to and finally resolved by "
                        "arbitration in accordance with the Arbitration and Conciliation Act, 1996. The seat of arbitration shall be New Delhi. "
                        "The tribunal shall consist of a sole arbitrator appointed mutually."
                    ),
                    "strict": (
                        "All disputes shall be resolved by binding arbitration under the rules of the Mumbai Centre for International Arbitration (MCIA). "
                        "The arbitration seat shall be Mumbai. The language of arbitration shall be English. The prevailing party shall be entitled "
                        "to recover reasonable attorney fees and costs."
                    )
                },
                "explanations": {
                    "standard": "Disputes are settled by a single mutual arbitrator in Delhi, avoiding court battles.",
                    "strict": "Disputes go to formal arbitration in Mumbai under MCIA rules, and the loser pays the winner's legal bills."
                }
            },
            "liability": {
                "name": "Liability Limit",
                "description": "Caps the maximum financial damages a party can claim.",
                "variations": {
                    "standard": (
                        "Except for breaches of confidentiality or indemnity obligations, in no event shall either party's total liability "
                        "under this Agreement exceed the total amounts paid or payable to a party in the twelve (12) months preceding the claim."
                    ),
                    "strict": (
                        "The Company's maximum liability for any claims arising under this Agreement shall be strictly capped at the fees actually "
                        "paid to the Company in the prior three (3) months. In no event shall the Company be liable for any indirect, consequential, "
                        "special, or punitive damages. The Counterparty's liability is not capped."
                    ),
                    "unlimited": (
                        "Nothing in this Agreement shall limit or exclude the liability of either party for gross negligence, willful misconduct, "
                        "infringement of intellectual property, or breach of confidentiality obligations."
                    )
                },
                "explanations": {
                    "standard": "Liability is limited to the amount of money paid under the contract over the past year.",
                    "strict": "Your liability is heavily limited (e.g. 3 months fees), indirect damages are excluded, and the other side has no cap.",
                    "unlimited": "Neither side caps their liability for severe issues like confidentiality leaks or IP violations."
                }
            },
            "intellectual_property": {
                "name": "Intellectual Property",
                "description": "Determines who owns the creations and deliverables under the contract.",
                "variations": {
                    "standard": (
                        "Except as explicitly provided herein, each party retains all rights, title, and interest in its pre-existing "
                        "intellectual property. Any intellectual property created as a deliverable under the scope of this services agreement "
                        "shall be owned by the Client upon full payment of all outstanding fees."
                    ),
                    "strict": (
                        "All Intellectual Property rights created, conceived, or reduced to practice under this Agreement by the Vendor "
                        "shall automatically vest solely and exclusively in the Customer immediately upon creation. Vendor hereby assigns "
                        "all rights, title, and interest worldwide in such IP to the Customer as a 'work for hire'."
                    )
                },
                "explanations": {
                    "standard": "Each side keeps their original IP, and the buyer owns new work once they pay for it.",
                    "strict": "The buyer owns all intellectual property from the moment it is created, and the provider has no rights to it."
                }
            },
            "data_protection": {
                "name": "Data Protection",
                "description": "Ensures compliance with data protection laws (e.g. DPDP Act, GDPR).",
                "variations": {
                    "standard": (
                        "Each party shall comply with its respective obligations under applicable data protection laws, including the Digital Personal "
                        "Data Protection (DPDP) Act, 2023. The parties shall implement reasonable technical and organizational measures to safeguard "
                        "personal data processed under this Agreement."
                    ),
                    "strict": (
                        "The Processor shall process personal data solely on written instructions from the Controller, maintain strict access controls, "
                        "notify the Controller of any data breach within twelve (12) hours, and fully cooperate with audits. The Processor agrees to "
                        "fully indemnify the Controller for any regulatory penalties under the DPDP Act resulting from Processor's breach."
                    )
                },
                "explanations": {
                    "standard": "Both sides agree to follow data privacy laws (like DPDP Act) and keep personal information secure.",
                    "strict": "The service provider has strict instructions on data handling, must report breaches in 12 hours, and pays all penalties if they violate privacy rules."
                }
            },
            "payment": {
                "name": "Payment Terms",
                "description": "Details invoicing schedules, rates, and penalties for late payments.",
                "variations": {
                    "standard": (
                        "The Client shall pay all undisputed invoices within thirty (30) days of receipt. Late payments shall accrue interest "
                        "at a rate of one percent (1.0%) per month or the maximum rate permitted by law, whichever is lower."
                    ),
                    "strict": (
                        "The Client shall make payments in advance of services. Payments are due within ten (10) calendar days of invoice date. "
                        "Late payments shall immediately incur a late fee of 1.5% per month, and the Provider reserves the right to suspend all services "
                        "without notice if any invoice remains unpaid for over fifteen (15) days."
                    )
                },
                "explanations": {
                    "standard": "Payment is due 30 days after the invoice. Late payments accrue interest at 1% per month.",
                    "strict": "Payment is due in 10 days, late fees are high (1.5%), and work stops immediately if unpaid for 15 days."
                }
            },
            "renewal": {
                "name": "Renewal",
                "description": "Outlines how the contract duration is extended.",
                "variations": {
                    "standard": (
                        "Upon expiration of the initial term, this Agreement shall automatically renew for successive terms of one (1) year "
                        "unless either party provides written notice of non-renewal at least thirty (30) days prior to the end of the current term."
                    ),
                    "manual": (
                        "This Agreement shall not automatically renew. Any extension of the Term must be mutually agreed upon in writing "
                        "by both parties in a signed amendment at least sixty (60) days prior to the expiration of the current Term."
                    )
                },
                "explanations": {
                    "standard": "The contract automatically rolls over for another year unless someone gives 30 days' notice to stop it.",
                    "mutual": "The contract ends on its own unless both sides sign a new agreement to extend it."
                }
            },
            "notice": {
                "name": "Notice",
                "description": "Specifies how official communications must be delivered to be legally binding.",
                "variations": {
                    "standard": (
                        "All notices under this Agreement shall be in writing and deemed given when delivered personally, sent by certified mail "
                        "(return receipt requested), or sent by recognized overnight courier to the addresses listed herein, or by email with "
                        "confirmation of delivery."
                    ),
                    "strict": (
                        "All formal notices must be sent in writing via registered post with acknowledgment due or national overnight courier "
                        "to the registered corporate address. Notices sent via email or messaging applications shall not be considered valid "
                        "legal notice under this Agreement."
                    )
                },
                "explanations": {
                    "standard": "Official notifications can be sent by registered mail, courier, or email with delivery receipt.",
                    "strict": "Notices must be physical courier/mail at the corporate headquarters; email notices are not legally recognized."
                }
            },
            "governing_law": {
                "name": "Governing Law",
                "description": "Identifies the state/country laws that govern the contract interpretation.",
                "variations": {
                    "standard": (
                        "This Agreement shall be governed by, construed, and enforced in accordance with the laws of India, "
                        "without regard to its conflict of laws principles."
                    ),
                    "delhi": (
                        "This Agreement and any dispute arising out of it shall be governed exclusively by the laws of India, "
                        "specifically applicable to the National Capital Territory of Delhi."
                    )
                },
                "explanations": {
                    "standard": "The contract is interpreted and governed under the laws of India.",
                    "delhi": "The contract is interpreted under Indian law with specific reference to Delhi state laws."
                }
            }
        }

    def get_clause(self, clause_type: str, variation: str = "standard") -> Dict[str, str]:
        """
        Fetch a clause by type and variation name.
        """
        c_type = clause_type.lower().strip()
        clause_data = self._library.get(c_type)
        if not clause_data:
            return {
                "text": f"[Missing Clause: {clause_type}]",
                "explanation": "No explanation available."
            }

        text = clause_data["variations"].get(variation)
        if not text:
            # Fall back to standard
            text = clause_data["variations"].get("standard", "")
            variation = "standard"

        explanation = clause_data["explanations"].get(variation, "")
        return {
            "name": clause_data["name"],
            "text": text,
            "explanation": explanation
        }

    def list_clauses(self) -> List[Dict[str, Any]]:
        """
        Lists all clause types and their descriptions.
        """
        return [
            {
                "id": key,
                "name": val["name"],
                "description": val["description"],
                "variations": list(val["variations"].keys())
            }
            for key, val in self._library.items()
        ]

"""
Hardcoded, vetted demo answers for the NEET-UG paper leak topic, shared by both the
voice assistant and the text chat orchestrator so a live public demo behaves
identically and reliably whether the question is typed or spoken. A live LLM call is
inconsistent turn-to-turn (different facts/phrasing each time) and occasionally fails
outright (rate limits, timeouts) — unacceptable for a live demo.
"""
from typing import Optional

# Case-name follow-ups ("what happened in Vyapam?") are distinctive enough to match on
# their own, even without the word "NEET" in the same sentence — natural conversation
# drifts to just the case name after it's been mentioned once.
NEET_CASE_ANSWERS: list[tuple[tuple[str, ...], str]] = [
    (
        ("vyapam", "viapom", "vyapan", "viyapam"),  # common STT mishearings of "Vyapam"
        "The Vyapam scam was a large-scale examination fraud in Madhya Pradesh, "
        "uncovered around 2013, involving impersonation and paper leaks across "
        "several recruitment and medical entrance exams. Courts ordered "
        "cancellation of the affected exams and criminal prosecution of those "
        "responsible, and it remains the leading precedent for treating systemic "
        "exam fraud as grounds for cancellation."
    ),
    (
        ("tanvi sarwal", "aipmt"),
        "In the Tanvi Sarwal case of 2015, the Supreme Court cancelled the All "
        "India Pre-Medical Test, or AIPMT, after a paper leak was discovered, and "
        "ordered a re-conducted exam. The Court held that even if only a section "
        "of candidates benefited, the sanctity of a national-level exam is "
        "compromised the moment its question paper is leaked."
    ),
    (
        ("nidhi kaim",),
        "In Nidhi Kaim versus State of Madhya Pradesh, the Supreme Court dealt "
        "with the fallout of the Vyapam scam and held that once systemic fraud "
        "taints an admission process, and genuine candidates cannot be clearly "
        "separated from fraudulent ones, cancelling the entire process is "
        "justified to protect public trust in the examination system."
    ),
    (
        ("sachin kumar",),
        "In Sachin Kumar versus Union of India, the Supreme Court held that a "
        "proven, isolated leak — where the beneficiaries can be clearly "
        "identified and separated from honest candidates — does not "
        "automatically require cancelling the entire exam, unlike a systemic "
        "leak such as Vyapam."
    ),
]

# Generic follow-ups ("what's the punishment?") share common words with unrelated legal
# questions, so these only fire once we already know we're in a NEET-topic conversation
# (see match_neet_topic).
NEET_GENERIC_FOLLOWUPS: list[tuple[tuple[str, ...], str]] = [
    (
        ("punishment", "penalty", "sentence", "jail", "prison", "imprisonment"),
        "Under the Public Examinations Prevention of Unfair Means Act, 2024, those "
        "involved in organized paper leaks face rigorous imprisonment of up to ten "
        "years and fines of up to one crore rupees. If a coaching institute or "
        "service provider is involved, their property can also be attached. "
        "Cheating and conspiracy charges under Sections 318 and 61 of the "
        "Bharatiya Nyaya Sanhita can add further imprisonment on top of that."
    ),
    (
        ("cancel", "re-conduct", "reconduct", "re-exam", "reexam", "retest", "re-test"),
        "Courts have ordered full re-examinations before, in the Vyapam and AIPMT "
        "cases, when the leak was found to be widespread and honest candidates "
        "could not be separated from those who benefited. For NEET-UG, the "
        "Supreme Court examines whether the leak was systemic or an isolated, "
        "contained incident before deciding, following the standard set in Sachin "
        "Kumar versus Union of India, which held that a proven, isolated leak does "
        "not automatically require cancelling the entire exam."
    ),
    (
        ("who is responsible", "nta", "national testing agency", "who conducted", "who runs"),
        "The National Testing Agency, or NTA, conducts NEET-UG under the Ministry "
        "of Education. Where negligence or complicity is found, the NTA and its "
        "officials can be held liable under the Public Examinations Act 2024, and "
        "separately, any public servant who took a bribe can be prosecuted under "
        "the Prevention of Corruption Act."
    ),
    (
        ("what can students do", "students do", "remedy", "compensation", "how can i", "how can we", "how do students"),
        "Affected students can file a writ petition under Article 32 directly "
        "before the Supreme Court, or under Article 226 before a High Court, "
        "seeking a fair re-examination or compensation. Many students in this "
        "matter have already done exactly that, and the Court has consolidated "
        "these petitions for a common hearing."
    ),
    (
        ("digital", "online", "whatsapp", "telegram", "internet", "social media"),
        "If the leaked question paper was circulated through digital platforms "
        "such as WhatsApp or Telegram, Sections 43 and 66 of the Information "
        "Technology Act, 2000 apply for unauthorized access and data theft, in "
        "addition to the physical paper leak charges."
    ),
]

NEET_LEAK_OVERVIEW_ANSWER = (
    "Similar cases have happened before — the Vyapam scam and the AIPMT leak in the "
    "Tanvi Sarwal case — where courts cancelled and re-conducted the exams to protect "
    "honest students. For NEET-UG specifically, the government has now implemented the "
    "Public Examinations Prevention of Unfair Means Act, 2024, making organized paper "
    "leaks a non-bailable offence under Sections 3, 9, and 10. Cheating and conspiracy "
    "charges also apply under Sections 318 and 61 of the Bharatiya Nyaya Sanhita. The "
    "key citations students should rely on are: the Public Examinations Act 2024, BNS "
    "Sections 318 and 61, and the Supreme Court's ruling in Nidhi Kaim versus State of "
    "Madhya Pradesh on preserving exam integrity."
)

NEET_LEAK_CITATIONS = [
    {
        "document_id": "public_examinations_act_2024",
        "title": "Public Examinations (Prevention of Unfair Means) Act, 2024",
        "section": "Sections 3, 9, 10",
        "page": None,
        "citation": "Public Examinations (Prevention of Unfair Means) Act, 2024 — Sections 3, 9, 10"
    },
    {
        "document_id": "bharatiya_nyaya_sanhita",
        "title": "Bharatiya Nyaya Sanhita, 2023",
        "section": "Sections 318, 61",
        "page": None,
        "citation": "Bharatiya Nyaya Sanhita — Sections 318 (cheating) and 61 (conspiracy)"
    },
    {
        "document_id": "nidhi_kaim_v_state_of_mp",
        "title": "Nidhi Kaim v. State of Madhya Pradesh",
        "section": None,
        "page": None,
        "citation": "Nidhi Kaim v. State of Madhya Pradesh, Supreme Court of India"
    }
]


def match_neet_topic(user_query: str) -> bool:
    q = user_query.lower()
    # STT occasionally mishears "NEET" as "need" and "leak" as "lead" — cover that
    # without letting the very common word "need" alone false-positive on unrelated
    # queries by requiring "paper" alongside it. "reconduct(ed)" is distinctive enough
    # on its own to catch natural follow-ups that drop "NEET"/"paper" entirely.
    return "neet" in q or ("need" in q and "paper" in q) or "reconduct" in q


def get_neet_demo_answer(user_query: str) -> Optional[str]:
    """
    Picks the most specific canned answer for a NEET-topic conversation, or None if
    this particular question isn't one we have a fixed answer for (caller should fall
    through to the live LLM/orchestrator in that case).
    """
    q = user_query.lower()

    for keywords, answer in NEET_CASE_ANSWERS:
        if any(kw in q for kw in keywords):
            return answer

    if not match_neet_topic(q):
        return None

    for keywords, answer in NEET_GENERIC_FOLLOWUPS:
        if any(kw in q for kw in keywords):
            return answer

    return NEET_LEAK_OVERVIEW_ANSWER


# Hardcoded, vetted analysis for the "lost mobile phone FIR draft" demo document — same
# reasoning as the NEET voice answers: a live document analysis burns ~6 Gemini calls
# per upload and is unacceptable to risk failing live. This is a completeness check
# (missing mandatory fields a police station will reject the FIR without), not a
# contract-style clause/risk review.
LOST_PHONE_FIR_ANALYSIS = {
    "missing_information": [
        "Date & time of incident",
        "Location of loss",
        "Police station name",
        "Full name & address",
        "Contact number",
        "IMEI number",
        "Phone purchase details (optional)"
    ],
    "suggestions": [
        "Replace placeholders with actual values.",
        "Mention how and where the phone was lost.",
        "Add contact details for follow-up.",
        "Attach purchase bill if available."
    ],
    "completeness_score": 72,
    "completeness_status": "Needs Improvement before submission."
}


def match_lost_phone_fir(text: str) -> bool:
    t = text.lower()
    mentions_loss = any(kw in t for kw in ("lost", "missing", "misplace"))
    mentions_phone = any(kw in t for kw in ("phone", "mobile", "imei"))
    mentions_fir = any(kw in t for kw in ("fir", "first information report", "police station"))
    return mentions_loss and mentions_phone and mentions_fir

# Product

## Register

brand

Primary register is brand (the landing page is the first impression and sets the trust bar). App surfaces (dashboard, chat, cases, documents, compliance, settings) are product-register — override per task when working inside `frontend-app/src/pages` beyond Landing.tsx.

## Users

Two audiences, one interface:
- **Consumers**: no legal background, need quick guidance. Want simplicity, confidence, plain language.
- **Professionals**: lawyers, law firms, corporate legal teams, compliance officers, legal researchers. Want efficiency, structured information, enterprise polish, speed.

Interface must satisfy both without feeling overly technical (alienates consumers) or overly simplistic (undermines professional trust).

## Product Purpose

LawGPT AI OS is an AI-native Legal Operating System, not a chatbot. Built for the MOONSHOT Buildathon. Full-stack platform comprising autonomous legal agents, orchestration, REST APIs, RAG, document intelligence, compliance engine, Indic voice, and high-performance React UI.

Success looks like: a legal professional or first-time user opens the product and immediately trusts it with real legal work, without the interface announcing "AI demo."

## Brand Personality

Trustworthy, Precise, Calm.

Communicates intelligence, trust, speed, clarity, confidence from the first screen. Premium, not trendy. Calm confidence over hype.

## Anti-references

- Generic AI-startup aesthetics (gradient blobs, hero-metric templates, tiny uppercase eyebrows on every section, numbered 01/02/03 scaffolding without real sequence)
- Anything that reads as a hackathon demo or unstyled template
- Overly playful/consumer-startup tone that would undermine professional/legal trust
- Overly dense/technical enterprise-software coldness that would alienate first-time consumer users

## Design Principles

1. Calm confidence over hype — no marketing buzzwords, no urgency theatrics.
2. Dual-audience clarity — every screen must read as simple to a layperson and credible to a lawyer simultaneously.
3. Motion with purpose — animate only for orientation, hierarchy, feedback, or perceived performance.
4. API-ready, backend-free — mock data modular and swappable, zero business logic in components.
5. One milestone at a time — build, review, confirm before moving to the next feature; never batch-commit without explicit approval.

## Accessibility & Inclusion

WCAG AA baseline: keyboard navigation, visible focus states, sufficient contrast (4.5:1 body text), reduced-motion alternative for all animation, dark mode compatibility, responsive down to mobile.

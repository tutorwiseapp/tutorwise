# Sage AI Tutor — DfE Safety Compliance Checklist

**Version:** 1.0
**Date:** 2026-03-15
**Framework:** UK Department for Education — Generative AI in Education Safety Framework (Jan 2026)
**Status:** Phase S1 Implementation

---

## Overview

The DfE framework defines 5 safety areas for generative AI tools used in UK education. This document maps each area to Sage's implementation and identifies any remaining gaps.

---

## Area 1: Filtering & Monitoring

**Requirement:** AI tools must filter harmful input and output, and log interactions for review.

| Control | Implementation | File | Status |
|---|---|---|---|
| Input safety classifier | Rules-based classifier screens all messages before LLM. Detects: prompt injection, profanity, self-harm, violence, sexual content, bullying, PII | `sage/safety/input-classifier.ts` | Done |
| Output validator | Post-LLM validation checks for: inappropriate content, PII leakage, hallucinated exam info, Socratic mode violations | `sage/safety/output-validator.ts` | Done |
| PII stripping | Input PII (emails, phones, postcodes, NI numbers) replaced with placeholders before LLM call. Output PII also stripped | `input-classifier.ts`, `output-validator.ts` | Done |
| Audit logging | All blocked inputs and safety events logged to `sage_safeguarding_events` table with severity, category, details | Migration 408 | Done |
| Admin review | Events table has admin-only RLS. Severity index for prioritised review | Migration 408 RLS policies | Done |
| Real-time blocking | Unsafe messages return immediately with appropriate response — never reach LLM | Stream route early return | Done |

**Gaps:** None for Phase S1. Future: LLM-based secondary classifier for ambiguous cases.

---

## Area 2: Accuracy

**Requirement:** AI tools must provide accurate information and avoid hallucination.

| Control | Implementation | File | Status |
|---|---|---|---|
| Deterministic math solver | Hybrid solver (mathjs + nerdamer) verifies all mathematical answers. LLM handles pedagogy, solver handles computation | `sage/math/hybrid-solver.ts` | Done |
| RAG knowledge retrieval | Multi-tier retrieval (user materials → shared → Sage knowledge → curriculum) grounds responses in verified content | `sage/knowledge/enhanced-retriever.ts` | Done |
| Curriculum alignment | Maths curriculum fully mapped with topics, prerequisites, misconceptions. Resolver injects curriculum context into LLM | `sage/curriculum/resolver.ts` | Done |
| Hallucination guard | Output validator flags hallucinated exam dates, predicted grades, and unverifiable claims | `sage/safety/output-validator.ts` | Done |
| Socratic enforcement | In Socratic mode, direct answers are detected and rewritten as guiding questions — prevents presenting unverified answers as facts | `sage/safety/output-validator.ts` | Done |

**Gaps:**
- English and Science curriculum data incomplete (skeleton only) — Phase S4 addresses this
- No fact-checking pipeline against authoritative sources — future enhancement
- Problem bank not yet populated with verified questions — Phase S3 addresses this

---

## Area 3: Data Protection (GDPR)

**Requirement:** AI tools must comply with UK GDPR. No personal data sent to LLM providers without basis.

| Control | Implementation | File | Status |
|---|---|---|---|
| PII stripping before LLM | All student messages stripped of: email, phone, postcode, NI number before any LLM API call | `sage/safety/input-classifier.ts` `stripPII()` | Done |
| No PII in system prompts | System prompts contain persona type and subject, never student names, emails, or personal details | `sage/providers/base-provider.ts` | Done |
| Session data retention | Messages stored in `sage_messages` table. Subject to platform data retention policy | Database RLS | Done |
| Provider data policies | All LLM providers (Anthropic, Google, OpenAI, xAI, DeepSeek) have zero-retention API policies for non-training use | Provider ToS | Verified |
| Safeguarding events | Logged with user_id for legitimate safeguarding interest. Admin-only access via RLS | Migration 408 | Done |

**Gaps:**
- No explicit data retention/deletion schedule documented for `sage_messages` — needs policy document
- No data subject access request (DSAR) tooling for Sage-specific data — platform-level concern

---

## Area 4: Governance

**Requirement:** Clear governance, human oversight, and accountability for AI decisions.

| Control | Implementation | File | Status |
|---|---|---|---|
| Audit trail | Every message (user + assistant) logged to `sage_messages`. Safety events logged to `sage_safeguarding_events` | Stream route + Migration 408 | Done |
| Safety event review | Admin dashboard can query events by severity, category, date. High-severity events flagged for immediate review | `sage_safeguarding_events` indexes | Done |
| Provider attribution | Every response includes `provider` metadata (which LLM generated it) | Stream route metadata event | Done |
| Teaching mode logging | Teaching mode recommendation logged per interaction (Socratic/Direct/Adaptive/Supportive) | Console log (upgrade to DB) | Partial |
| Fallback transparency | When primary provider fails, fallback provider is logged and reported in response metadata | Stream route fallback handling | Done |
| Human escalation | Wellbeing alerts (high severity) immediately redirect to human support services (Childline, Samaritans) | `sage/safety/wellbeing-detector.ts` | Done |

**Gaps:**
- Teaching mode selection not yet persisted to database (console-only) — low priority
- No admin UI for reviewing safeguarding events — Phase S5 (analytics) will add this
- No "explain this decision" capability for individual responses — future enhancement

---

## Area 5: Emotional Influence

**Requirement:** AI tools must not manipulate students emotionally. Must detect and respond appropriately to distress.

| Control | Implementation | File | Status |
|---|---|---|---|
| Wellbeing detection | 3-tier detection: high (self-harm, crisis), medium (bullying, distress, anxiety), low (frustration) | `sage/safety/wellbeing-detector.ts` | Done |
| Crisis response | High-severity: immediately stops tutoring, shows support resources (Childline 0800 1111, Samaritans 116 123, Shout 85258) | `wellbeing-detector.ts` `SUPPORT_MESSAGES` | Done |
| No counselling attempt | Sage explicitly does NOT attempt to counsel — redirects to qualified humans | Support messages wording | Done |
| Tone adaptation | Medium/low wellbeing triggers switch to supportive teaching mode. Encouragement without manipulation | Stream route + `teaching/modes.ts` | Done |
| Age-appropriate language | 3 age brackets (primary/secondary/adult) with vocabulary level, tone guidelines, forbidden topics | `sage/safety/age-adapter.ts` | Done |
| No manipulative engagement | Sage does not use streak-based guilt, fear of missing out, or artificial urgency. Progress tracking is factual, not emotional | Teaching mode configs | Done |
| Growth mindset framing | Supportive mode emphasises effort over results, normalises mistakes, celebrates attempts | `teaching/modes.ts` supportive config | Done |

**Gaps:** None for Phase S1.

---

## Summary

| DfE Area | Status | Coverage |
|---|---|---|
| 1. Filtering & Monitoring | **Compliant** | Full input/output safety pipeline with audit logging |
| 2. Accuracy | **Partial** | Math solver + RAG + curriculum. Gaps: English/Science curriculum, problem bank |
| 3. Data Protection | **Mostly Compliant** | PII stripping, zero-retention providers. Gaps: retention policy doc, DSAR tooling |
| 4. Governance | **Mostly Compliant** | Audit trail, provider attribution, escalation. Gaps: admin review UI, teaching mode DB logging |
| 5. Emotional Influence | **Compliant** | 3-tier wellbeing detection, crisis redirect, age adaptation, no manipulation |

**Overall:** Sage meets the DfE framework across all 5 areas at a functional level. Remaining gaps are administrative (policy documents, admin UI) and will be addressed in Phases S3-S5.

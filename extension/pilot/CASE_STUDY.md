# HCI case-study outline — Chrysalis

**Status: structure for future work. No participant observations, interviews,
statistics, testimonials or wellbeing findings have been collected for this outline.**
Automation/screenshot sessions are engineering checks, not user research.

## 1. Product and design problem

Implemented scope: an independent desktop YouTube Chrome extension for optional
session planning, reversible viewing controls, foreground-time awareness,
checkpoints, voluntary breaks, optional reflection and local history. Product intent:
help viewing match users' own intentions. Entertainment/exploration remain valid.

Describe the transition from existing applications using the repository audit and
actual implementation, without presenting conversation ideas as shipped features.
Evidence: `docs/youtube-extension-transition.md`, implementation status and contracts.

## 2. Questions, not assumed outcomes

- Can people understand, choose and reverse the controls?
- Do timing labels and recovery states match their interpretation?
- Do checkpoints support choice or create unwanted friction?
- Do people understand local data, the in-page intention and deletion?
- Which layouts, devices or access needs expose barriers?

These questions do not assume improved focus, productivity or mental health.

## 3. Design rationale and tradeoffs

Document actual choices: no target/default hiding, one foreground timeline,
conservative gap recovery, fail-open selectors, non-blocking prompts, separate
wall-clock breaks, missing reflection data, bounded local history and no telemetry.
Use code paths and engineering validation to support implementation claims.

_Future rationale changes prompted by observations: [NOT YET OBSERVED]._

## 4. Proposed study method

Voluntary guided usability sessions followed by the optional questionnaire.
Before conducting: define recruitment, intended sample, browser/OS coverage,
facilitator role, accessibility accommodations, consent, contact/retention plan,
withdrawal procedure and any applicable institutional review requirements.

_Actual dates, method, sample and recruitment: [NOT YET CONDUCTED]._

_Actual consent/ethics process and any approvals: [NOT YET ESTABLISHED; do not claim approval]._

## 5. Observation record template

| Field | Future entry |
| --- | --- |
| Consented session identifier / setup | [NOT YET RECORDED] |
| Task / participant-selected action | [NOT YET OBSERVED] |
| Observed interaction or difficulty | [NOT YET OBSERVED] |
| Direct participant explanation, if volunteered | [NOT YET COLLECTED] |
| Evidence source / permission boundary | [NOT YET RECORDED] |
| Interpretation and competing explanations | [NOT YET ANALYZED] |
| Proposed change and verification | [NOT YET DECIDED] |

Do not record video histories or personal notes. Do not convert skipped questions
or reflections into negative responses. Separate observed behavior from inference.

## 6. Findings and synthesis

_Themes: [NO FINDINGS YET]._

_Disconfirming evidence / differences between participants: [NO FINDINGS YET]._

_Quotations: [NONE; specific permission required before use]._

_Counts/denominators and missing data: [NO DATA YET]._

No fabricated personas, participant quotes, usage metrics, before/after improvement
claims or diagnostic labels. If quantitative counts are later reported, state the
actual small sample, task conditions, denominator and uncertainty.

## 7. Iteration and evaluation

_Changes motivated by collected evidence: [NO RESEARCH-DRIVEN ITERATIONS YET]._

_Results of a subsequent evaluation: [NOT YET CONDUCTED]._

Engineering fixes already documented in HARDENING.md are code-review/test outcomes;
do not relabel them as participant findings.

## 8. Limitations and reflection

Distinguish fixture tests, live signed-out checks, native Chrome checks and future
participant observations. Discuss self-selection, novelty, facilitator influence,
short observation periods, unverified layouts/accessibility, timing uncertainty and
local-only data. Do not infer causal or mental-health effects from this pilot.

_Future lessons and next research questions: [TO BE WRITTEN AFTER REAL OBSERVATIONS]._

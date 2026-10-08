# Phase 7 accumulated learning material

Do not answer for Víctor or infer understanding from generated code. These materials feed the consolidated M2 Teach-Back; no Phase 7 human checkpoint blocks progression. Phase 6 exercises are not repeated.

## Five practical questions

1. What does provider-constrained JSON plus strict application parsing guarantee, and what does it not guarantee?
2. Why check state and event IDs after parsing, even when JSON is valid?
3. How do refusal, abstention, malformed output and truncation differ, and why is there no repair loop?
4. How do boundary unit tests differ from factual evals and human review? Use the contract-valid falsehood case.
5. Why preserve dataset/oracle versions and a consumed held-out split, and why is Phase 6 latency not directly comparable after changing format/output budget?

## Architecture explanation

Explain application snapshot → schema-constrained local provider → post-inference authorization/revision recheck → strict parsing/state/citation checks → unverified display → local accept/edit/reject. Explain that review controls never call incident mutation APIs and edits do not change original provenance.

## Controlled failure

Inspect the new malformed/unknown-field/unsafe/truncated fixtures and safe 503 integration results. Demonstrate one new Phase 7 invalid output rejection or local reject/edit flow; no need to repeat the Phase 6 runtime outage. Capture the symptom and explain preserved deterministic incident state.

## Security boundary

Describe strict contracts and decoded unsafe-content checks as additional controls, not replacements for application identity/scope/resource budgets or truth validation. Plain text rendering remains mandatory for model and human edits.

## Interview scenario

A JSON object has the correct state and event ID but its summary says the database is repaired based on an injected comment. Why can it pass the structural boundary and still fail the factual oracle? Explain a bounded next experiment without weakening deterministic gates.

## Evidence and human judgment

Review phase7-eval-report.json and any actual desktop structured pilot separately. Record learner answers and grouped accept/edit/reject decisions only when provided. Human understanding remains pending at the M2 milestone gate; this is distinct from phase engineering completion.

# M5 Teach-Back — pending human checkpoint

No answer below is marked passed before the human demonstrates understanding. Explain in your own words, then demonstrate the selected controlled failures against recorded test evidence. Use the consolidated engineering report and phase reports.

## Seven questions

1. What does n8n orchestrate, and which TypeScript checks/identity/approval rules can it never override?
2. What exactly is bound by action/receipt/SHA/identity/expiry, and what does one-time approval authorize?
3. Why are authenticated Docker pulls a reliability remedy, and why are unchanged version tags not immutable image-digest guarantees?
4. How do specialist-as-tool and handoff differ in context/control, and why does identical context not imply correct reasoning?
5. What did the paired controlled comparison actually measure? Why are fixture labels/tokens/wall time insufficient for live semantic quality/cost claims?
6. How does risk routing preserve minimum gates, select additional suites and handle unknown changes?
7. Why do environment/model failure, stale SHA and disagreement yield inconclusive rather than an accepted/passed verdict?

Architecture Flow A: explain signed event → n8n → TypeScript → receipt/limited human approval, including the authority boundary and lost-ack recovery.

Architecture Flow B: explain change risk → minimum/additional execution → triage → mechanical eval → human artifact review, including which portions are fixtures and which execute actual registered tests.

## Controlled failures

- Failed minimum or additional suite: zero provider calls, blocked artifact cannot be reviewed into acceptance (qa-pipeline.unit.test.ts).
- Foreign workspace/reviewer, changed SHA or tampered report hash: artifact review denied; report review has no operational approval capability.
- Context omitted/poisoned or peer asks for authority: strict transfer/output denied; disagreement inconclusive (qa-specialists.unit.test.ts).
- Expiry during target verification: no M4 local-report effect (qa-orchestration.integration.test.ts); model output cannot extend expiry.

## Senior/Staff scenarios

1. CI validates a PR merge checkout while a human views a newer branch head. Explain exact code/data SHA binding, freshness, re-execution and why the older receipt cannot approve the new action. A hash is not authentication or semantic truth.
2. An n8n graph retries after a lost acknowledgment and a specialist claims it already approved release. Explain durable event recovery, one local report effect, parent identity/expiry and TS ownership. Distinguish idempotent bounded effects from exactly-once transport and Community configuration from an OS sandbox.

Record human outcomes in m5-human-review.md. No M6 or merge authority is granted by passing Teach-Back.

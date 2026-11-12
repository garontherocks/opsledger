# Agreed Phase 9 / M2 quality acceptance policy — 2026-10-08

Explicitly agreed by the user after the actual M2 human/desktop checkpoint. This resolves the Phase 9 DoD requirement “quality threshold agreed”; it does not change deterministic safety requirements or grant M3 authorization.

## 1. Deterministic and safety boundaries are hard gates

Authorization, workspace isolation, revision/publication rechecks, citation/ID integrity, egress controls and prohibition of operational AI authority must remain deterministic.

A failure of one of these boundaries is a blocking failure. These controls are not subject to a probabilistic quality threshold.

## 2. Retrieval quality floor

For the current versioned lab evaluation set, retain:

- Recall@5 >= 0.85
- MRR >= 0.75

These measure retrieval mechanics only and are not claims of production semantic quality.

The M2 desktop result of Recall@5 = 1.0 and MRR = 1.0 satisfies this current lab retrieval floor, while the small synthetic dataset limitation remains documented.

## 3. Semantic quality policy for the M2 optional lab feature

The user does not approve a numeric semantic pass rate from the eight purposively sampled human judgments because that sample is too small and was not calibrated for that purpose.

For M2 acceptance, the AI feature is acceptable only as:

- optional;
- explicitly unverified;
- human-reviewed where material;
- unable to mutate incident state or perform operational actions;
- able to abstain when evidence is absent, insufficient or conflicting;
- with known semantic failures preserved as evidence rather than hidden.

Unsupported repair/closure claims, irrelevant grounded-looking recommendations and poor conflict handling remain semantic defects. They do not block this limited M2 lab milestone while the feature remains optional/unverified and has no authority, but they do block any claim that the model/prompt is production-quality or automatically promotable.

## 4. Future model/prompt promotion threshold

Before promoting a model or prompt as a quality improvement, require a fresh calibrated human-labeled held-out evaluation set with bilingual coverage.

The target for semantic support / answerability is >= 0.90, together with no critical unsupported operational claim in the defined critical/adversarial cases.

A single aggregate score is insufficient: retrieval, grounding, abstention, bilingual behavior and critical semantic failures must remain separately visible.

## 5. Product-value claim

Direct source/timeline reading remains the baseline.

Do not claim that AI improves the product until a future paired evaluation demonstrates measurable benefit over that baseline.

## Application to current evidence

The policy accepts the limited M2 optional lab feature with the recorded semantic defects; it does not assert universal correct abstention, eliminate the three literal failures, adopt prompt v2, promote a model or establish production quality. Actual judgments and learner answers remain unchanged in [human checkpoint](m2-human-checkpoint.md) and its structured evidence.

Formal assessment: [M2 acceptance check](m2-acceptance-check.md). No desktop or Teach-Back rerun is required. Phase 11/M3 remain unauthorized.

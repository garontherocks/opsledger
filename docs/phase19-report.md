# Phase 19 — bounded end-to-end QA

The direct workflow remains the default. The end-to-end experiment deterministically maps reviewed change paths to four mandatory lab gates plus registered additional suites, executes them, requests one unverified triage draft, evaluates contracts/provenance, and produces a SHA-bound artifact awaiting human review. No new model-driven browser, patch proposal or orchestration framework: no demonstrated gap justifies them.

## Scope and execution

`planQaChange` cannot remove minimum checks. Lifecycle/outbox/migration changes select lifecycle overlap; QA/auth/config/MCP/n8n boundaries select orchestration tests. Unknown non-documentation changes select every additional suite. Specialist boundary tests always run. Paths are bounded relative metadata, never executable arguments. Extra fields, traversal, command punctuation and arbitrary suite names are rejected.

The reviewed runner uses fixed Node executable/argument arrays and fixed registry paths through execFile, with SHA/clean checkout checks, bounded child buffers/timeouts and an overall deadline. It reuses the existing four-gate runner (including actual MCP/Skill egress/security tests). Additional native lifecycle/orchestration tests use disposable owned synthetic DB data. This is trusted repository test execution, not a sandbox for hostile repository code or an OS isolation guarantee. CI secrets are available only to the login step, temporary Docker auth is outside artifacts and always removed. No model or path input becomes shell/code; no runner credential is added to prompts.

`phase19-smoke` uses a clearly labeled synthetic change scenario on the actual CI checkout. All four minimum and all three additional suites execute. Triage and the artifact review are fixtures; neither is live semantic evidence or actual human approval. The SHA-bound report, receipts, suite output hashes and stage trace are archived in `evidence/phase19-pipeline.json`. The current PR check/run provides code provenance; the smoke SHA is the actual CI checkout (PR merge ref), not misrepresented as the branch head.

Minimum/additional failures block triage and review. Invalid/missing receipts, source digests, expiry, changed checkout, environment/model failures and malicious authority outputs are inconclusive. Mechanical draft evaluation does not certify factual truth. An awaiting-review artifact is never a passed QA/release verdict.

## Review boundary

The artifact hash detects content changes in the trusted parent flow; it is not a signature or authentication mechanism. The review helper accepts only a trusted parent's report/current SHA/identity, binds the report hash/workspace/reviewer/expiry, and has no network endpoint, persistence, approval token or effect capability. Repeated artifact review does not consume an operational approval, because it authorizes nothing. Existing M4 one-time approval remains solely for its specific local report and four-gate receipt; this artifact does not widen that approval to extra suites, merge or release.

## Tests/evals and evidence

Five local test groups passed: deterministic risk routing/malformed commands; happy trace and bound artifact review; minimum/additional failure dominance with zero model calls; environment/receipt/model/malicious failures; checkout/expiry/foreign identity/tampered review. Native full CI and actual registered smoke on this phase's final head are mandatory. Work has no Docker or repository git checkout: those actual execution claims are made only after CI, never from local injected runners.

Phase 18 engineering gate: c06bc4b3ab7c5830a8da8ef63328f5ba2e412d26, required CI 38009794558 green across API/browser/Windows before this phase began. Phase 17 final gate: 1b5c2fba335d69b7957ba408f8c612d1998fd0d7, required CI 38008991379 green. Original registry 429s and workflow validation failure remain in the record. Phase 18 ADR rejects default specialist adoption; real semantic comparison is reserved for the M5 human checkpoint.

## Learning

Risk routing expands deterministic evidence; it cannot let an AI remove mandatory checks. A valid model draft can still be wrong. Binding a hash and SHA establishes which evidence is reviewed, not whether the review is correct. The autonomy envelope ends at an unverified human-review artifact. General coding agents can edit/run arbitrary project commands; this QA experiment deliberately exposes only reviewed registered suites and grants no editing or release capability.

M5 engineering readiness depends on this final head's required CI. Formal M5 acceptance additionally requires the actual desktop bundle, material human semantic/security review and Teach-Back. PR #7 stays unmerged. No Phase 20/M6.

## Consolidated M5 checkpoint closure

The subsequent actual desktop/human checkpoint is complete on implementation SHA 15dba1139bfd8291500a87aecb6510ad99797a75. This supersedes earlier pending-checkpoint notes above without rewriting their historical status. Preserve actual artifacts in evidence/m5-desktop-bundle.json and m5-specialist-comparison-desktop.json; human outcomes are separate in evidence/m5-human-checkpoint.json. All three modes retain material reopening/isolation/audience failures; missing evidence is correctly handled. Reject default specialist adoption, retain no default retrieval adoption, and infer no calibrated quality/product-value claim. Phase 19 actual registered execution passed CI 38010338598; the checkpoint documentation/evidence successor still requires its own full CI. PR #7 remains unmerged/draft; no Phase 20/M6.

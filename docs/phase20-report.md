# Phase 20 — coordinated portfolio release

## Scope and status

M6 is explicitly authorized from accepted M5 main `5d0198847e228b525073f54dd06b880cac08f20c`. It has two coordinated deliverables: the OpsLedger technical evidence package and a revamp of the existing `garontherocks/victor-aller-sdet-site` portfolio. No new repository/site replaces it. No merge or public deployment is authorized.

This phase changes presentation/documentation, not accepted product/agent semantics, evidence, pins or quality gates. The root entry point, architecture, curated index, claims matrix, limitations, reproduction, interview material and publication review form the technical package. The original chronological README is preserved byte-for-byte as `README-history.md`.

M1–M5 conclusions remain unchanged: M3 9/9 turn-budget stops and zero drafts; M4 no default QA retrieval; M5 no default specialists, 3× calls without demonstrated semantic benefit. All limited approval, authority, isolation, supply-chain and transport caveats remain explicit.

## Validation record

Final-head proof belongs to the M6 PR checks/run, not a successor documentation commit created just to record green. Required OpsLedger API/browser/Windows CI and the separate website lint/build/browser CI must pass. Clean-state limitations (no local Docker/Windows/GPU) must be reported; prior green is never substituted for current-head green. No new accepted-model experiment is required.

## Clean-source validation and current limits

Source text was materialized from the exact accepted GitHub tree, with Git blob hashes checked before presentation edits; dependencies installed fresh from the committed lockfile (`npm ci --ignore-scripts`). Local lint, typecheck, build and 48/48 unit tests passed. Embedded integration passed 81/83 with two explicit native-only skips and zero failures. Those skips do not waive required native CI. The 93 new local documentation links resolved. New presentation text contains no private-key/token patterns or personal filesystem paths in the focused scan.

Binary historical OpsLedger screenshots/videos were not downloadable through the text-only GitHub connector. They remain unchanged in the repository tree and are not republished as inspected M6 media. The portfolio uses explanatory architecture and an exact historical resource comparison rather than decorative/unverified media. No M3/M4/M5 experiment was rerun. The local current Playwright browser download failed in this environment; required browser verification remains mandatory in CI and is not marked passed from that failure.

The existing website source was accessible and audited; its main baseline is `1c1e382576cb4099af3c1297a1acf7118e22d78c`. Its positioning now foregrounds Senior SDET / Quality Engineer and OpsLedger while retaining conventional projects/services and professional history. Website source and OpsLedger are private; original evidence links require access, visibly stated. Public source visibility is not changed.

## Compact final human review — pending

Review the two final PRs and their exact head CI before answering:

1. Does the website immediately communicate Senior SDET / Quality Engineer, Playwright + TypeScript and bounded AI/agentic QA—without implying a generic AI-engineer rebrand?
2. Are OpsLedger's three negative findings clear, correctly bounded and useful evidence of engineering judgment?
3. Can a reviewer navigate from a public claim to the original artifact and distinguish deterministic, mechanical, live-model, fixture and human-reviewed evidence?
4. Are synthetic/recorded examples labeled, and do selected assets contain no secrets, private data or personal filesystem paths?
5. Is it clear that required checks dominate AI, n8n has no policy authority and human approval grants only one bounded local-report effect?
6. Is publication still pending, with no public execution endpoint or deployment performed?

Record actual answers/security judgment only after the user reviews. M6 formal acceptance and publication are pending; no additional milestone is invented.

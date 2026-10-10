# Portfolio publication threat review

Phase 20 presents evidence and synthetic examples; it adds no OpsLedger runtime endpoint or inference service. The coordinated website source is [victor-aller-sdet-site](https://github.com/garontherocks/victor-aller-sdet-site). The user approved publication of the canonical OpsLedger repository as source/docs/evidence only, after final M6 acceptance and merge of PR #8. The website source remains private. No separate public evidence repository will be created. OpsLedger remains private during this preparation; this assignment authorizes no visibility change, merge or deployment. Recruiter-facing website copy targets the later public-source state and must not launch before OpsLedger is public.

| Surface | Review and constraint |
|---|---|
| Secrets / `.env` | Do not commit environment files, generated login credentials, Ollama access secrets, Docker tokens or authentication values. Placeholders and credential references are not values. Scan tracked text and inspect selected media before publication. |
| Data | Product screenshots use synthetic owned fixtures. Historical model cases are synthetic. No customer incident data or employment-private artifacts are added. |
| Public endpoints | Website is a case-study/navigation layer. No new agent, QA execution, model, n8n, administrative reset/setup or mutable product endpoint. Existing contact integration remains separate; do not submit test forms to it. |
| Prompts/tools | Published instructions/contracts are explanatory evidence, not public execution capabilities. No arbitrary prompt/tool input or elevated specialist authority is introduced. |
| Artifacts/logs | Preserve original failures and semantic judgments. Publish curated, inspected presentation assets; do not dump raw terminal traces, environment values or desktop paths into the website. Finite CI retention is explicit. |
| n8n export | Reuse the existing bounded export with credential references only. No credential values, Code/SSH/shell nodes or policy authority added. |
| Docker credentials | Existing CI uses password-stdin, temporary private `DOCKER_CONFIG`, logout/cleanup; tokens are not printed or added to artifacts. Auth repairs registry reliability, not mutable tag provenance. |
| Local URLs/paths | Loopback URLs in reproduction are intentional examples, not public services. No personal desktop paths in new presentation material. Canonical historical evidence is not relabeled/silently rewritten. |
| Website publication | Block automated deployment for the M6 feature branch using Vercel's branch-specific `git.deploymentEnabled=false`. No Vercel CLI deployment, merge or production alias change. Deployment requires later explicit authorization. |
| New attack surface | Documentation/static diagrams and read-only case-study copy only. No browser-use agent, backend, admin interface or GPU service added for presentation. |

## Final publication decision and execution boundary

| Human decision | Recorded status |
|---|---|
| OpsLedger repository publication | approved |
| OpsLedger public runtime/service deployment | not approved / not planned |
| victor-aller-sdet-site source visibility | remain private |
| separate public evidence repository | rejected as unnecessary |

Intended later sequence, only after final human authorization: **merge OpsLedger PR #8 → make OpsLedger public → merge website PR #18 → verify Vercel production deployment**. Publication exposes source, documentation and evidence, not an OpsLedger service/control plane. The canonical repository itself provides deep technical evidence. The user subsequently completed the final human truthfulness/clarity/security review, formally accepted M6, and explicitly authorized this ordered sequence. Publication remains source/docs/evidence only; no OpsLedger runtime/control-plane deployment is authorized.

Historical M1–M5 evidence is preserved without rewriting or sanitizing it merely for visibility. An actual secret/private-data publication blocker must be reported and execution stopped, rather than silently altering accepted evidence.

## Public demo decision

Do not deploy an OpsLedger runtime for Phase 20: exposing a control plane would add operational/security burden with little extra reviewer value. The existing web portfolio supplies the recruiter-facing summary, and the repository supplies deep evidence. This is not a promise of free-tier availability. No new hosting plan/service was purchased or relied on; a future publication action must check then-current Vercel terms, limits and project settings.

## Selected presentation media

The website PR contains `public/evidence/opsledger-product.png`: an actual local UI/API recording from accepted M5 source, fresh embedded database, synthetic account/incident and AI off. Visual inspection found no credentials, personal paths, customer data or private identifiers. It is not a live deployed service, model-quality observation or native PostgreSQL proof. Website `docs/media/` captures are read-only presentation review assets; the historical provider-call chart reuses accepted numbers. No accepted AI experiment was rerun, no new AI video was created, and existing binary OpsLedger evidence was neither relabeled nor republished without inspection.

## Final review boundaries

M6 was accepted only after both repositories had final-head validation, claims/evidence review, sanitized media inspection and the final human checkpoint. Accepted expensive M3/M4/M5 experiments were reused without rerunning/retuning. Historical limited acceptance remains limited.

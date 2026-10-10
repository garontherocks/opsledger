# Phase 17 Docker Hub authentication remediation

Repeated external pull-rate-limit failures blocked the final Phase 17 head. The authorized unchanged-head retry of run 37990038388, attempt 2, API job 114029011861, also failed resolving postgres:18.6 with HTTP 429. Native tests were not reached on that attempt. Prior actual n8n green evidence is preserved, not a substitute for the resulting final-head gate.

The user configured repository Actions secrets DOCKERHUB_USERNAME and DOCKERHUB_TOKEN. The only executable change adds Docker CLI login before the first registry access in both required Linux lanes and always-run credential cleanup before evidence upload. Windows and every existing test/gate are unchanged. No application code, Dockerfile, model, image, version or runtime test changes.

## Credential review

Secrets are step-local environment inputs to login, passed using password-stdin, never interpolated into shell source, build arguments or containers. Shell tracing is disabled; no credential values are printed or copied into evidence. Docker config lives in a private umask-077 directory under runner.temp; it is outside checkout and artifact paths and removed after logout, including failed jobs. The login step fails if required secrets are unavailable; there is no unauthenticated fallback or skipped required runtime test. This uses the existing Docker CLI, adding no action dependency or expanded GitHub permissions.

Docker stores its authenticated config for subsequent build/pull operations. Code executing as the same runner user can read it until cleanup. The trust boundary is therefore reviewed same-repository CI code and workflow authors, not hostile code sandboxing. Fork PRs receive no repository secrets under the existing pull_request event; pull_request_target is not introduced. Use a public-image-read-only PAT as requested; the connector cannot independently inspect its permissions or expiry. This credential has no OpsLedger policy/approval/release meaning.

## Image integrity review

Existing publisher references remain exactly postgres:18.6 and n8nio/n8n:2.42.6; pgvector remains 0.8.7 with its existing archive SHA-256 check. No latest tag, alternate registry, mirror, version substitution or runtime-test skip is introduced. Authentication changes pull attribution, not selected image contents or test authority. Docker verifies content hashes against the resolved manifest during delivery. Existing image references are version tags, not immutable digest pins; authentication does not make tags immutable or establish image signatures, and no historical digest is invented. Existing supply-chain/tag-mutability limitations remain. No caches with new writers or registry trust roots are added.

## Verification

Full required CI on the resulting head must validate successful authentication, native PostgreSQL/product/QA gates, actual n8n signed webhook and scrubbed export, browser and Windows. A successful login alone is insufficient. Authentication still has account/registry limits; any remaining external failure remains a blocker. No Phase 18 until the Phase 17 final-head run is genuinely green. No PR merge, M5 acceptance or M6 authorization inferred.

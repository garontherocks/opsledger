# Draft PR — Add the first authenticated incident slice

A signed-in reporter can create an incident for an active service in an authorized workspace, find it after reload and open its persisted detail. The server supplies identity, state, revision and timestamps; cross-workspace access and authority-field spoofing are rejected.

Adds reviewed migrations, repeatable synthetic seeding, strict Zod DTOs, signed keyset pagination, Better Auth sessions, safe correlated errors and a minimal accessible React UI. Phase 0 probes remain under lab/phase0. No Phase 2 behavior or model dependency.

Validation: lint/typecheck/build, 4 domain tests, 12 API/DB subtests, one browser E2E, startup smoke and dependency/secret review. Local DB evidence uses PGlite socket reporting server_version 18.3. Browser uses Playwright 1.64.0 with explicitly selected Chromium 141 because the requested browser download failed.

Before approval as fully complete: run native PostgreSQL 18.6 API and browser lanes and capture a real GitHub Actions run. Workflow is configured but has not run remotely. No remote PR was created, no branch was merged and nothing was deployed.

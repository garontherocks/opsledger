# OpsLedger — Phase 0 Readiness Package

Authorized scope: Phase 0 only. Baseline: approved AI-First App + Agentic QA Lab roadmap, including one-phase-per-assignment and milestone review rules.

This package contains planning contracts, ADRs, a disposable compatibility spike and actual validation evidence. The spike is not the application and must not become its production implementation by copying it blindly.

No model, agent framework, pgvector, queue, n8n or observability stack is installed. No Phase 1 product behavior is implemented. No GitHub repository/PR is claimed unless its URL is in the completion report.

Start reading docs/readiness.md and docs/phase1-contract.md. Exact tested dependency pins are in spike/package.json and package-lock.json. Evidence includes install, typecheck, test, build and audit records.

Reproduce the isolated probe with Node 24 in spike/: npm ci --ignore-scripts; npm run typecheck; npm test; npm run build. Review lockfile/install scripts before enabling scripts. The offline SQL/auth construction checks do not prove live PostgreSQL persistence or authentication.

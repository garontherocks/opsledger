# ADR 006: Risk-Based Deterministic Quality
Status: Accepted baseline.

Problem: UI-only tests fail to establish authorization/transaction guarantees.
Decision: node:test domain/DB integration, Fastify injection for fast contract checks, Playwright API/browser for appropriate acceptance risks. Small E2E set; independent expectations.
Consequences: controlled fixtures/time and evidence correlation; no retry-to-green or AI override.
Validation: Phase 1 AC matrix; actual probe output must not be labeled product coverage.

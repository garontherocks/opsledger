# Phase 5 primary references and dependency rationale

Consulted 2026-10-08 UTC. Exact package-lock.json governs execution.

- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing): AxeBuilder scans selected rendered states; automated checks require complementary manual assessment. Used dev-only @axe-core/playwright 4.13.0 with explicit WCAG tags.
- [PGlite API](https://pglite.dev/docs/api): dumpDataDir and loadDataDir support the isolated same-version embedded restore exercise. This is not native PostgreSQL backup/PITR.
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots): selected screenshot expectations depend on the rendering environment. The checked-in Linux expectation records the actual Chromium override; platform/browser upgrades require reviewed baselines.

No OpenTelemetry dependency: safe request IDs and bounded evidence are adequate for this local baseline. No AI dependencies or inference services. @axe-core/playwright/axe-core license and audit metadata are recorded in phase5 dependency evidence. All deployment/version limitations remain explicit.

# Draft PR — Add incident lifecycle, comments and revisioned activity

Authorized workspace responders/leads can triage, assign and investigate; leads can resolve, close and reopen. Active members can comment. Every command uses expectedRevision and commits incident/activity/comment writes atomically. A stale tab gets a conflict and must refresh; it is never silently resubmitted.

Adds a fixed domain state machine, strict action DTOs, migration/DB invariants, qualified assignments and paginated history. Preserves Phase 1 behavior and adds a role-aware UI. Reopening accepts an active replacement when a former assignee was revoked.

Local validation: lint/typecheck/build; six domain tests; integration reports 23 passed and one native test skipped; two browser flows; startup smoke; zero reported dependency vulnerabilities. Local SQL uses serialized PGlite socket, not native PostgreSQL. Native controlled-lock test and PostgreSQL 18.6 CI are configured but unexecuted. Full phase completion remains pending those gates. No Phase 3, merge or deployment.

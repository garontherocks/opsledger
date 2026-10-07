# Add versioned runbooks, scoped keyword search and transactional audit

Editors/admins can append immutable runbook versions and publish or withdraw an explicit version with a current head revision. Members search current publications with bounded filtered keyset pagination and can address historical published content by version and hash. Drafts/withdrawn versions remain restricted; Markdown is escaped text. Incident and knowledge writes now commit metadata audit in the same transaction.

Validation: local domain, API/DB, browser and startup acceptance; audit/rollback, stored-XSS, scope and microsecond/tie pagination regressions. Native PostgreSQL locking/deployment and actual remote CI evidence remain pending. This is a local draft; no remote PR or merge exists.

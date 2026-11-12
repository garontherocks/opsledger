# Phase 1 Contract and Acceptance

## Domain contract

Initial state is reported. Severity is low, medium, high or critical. Public body is strictly title, description, serviceId and severity. Unknown fields are rejected, including workspaceId, reporterId, role, state and revision.

Title: trim surrounding whitespace, 5–120 Unicode characters. Description: trim, 10–5000 characters. Document JavaScript code-point counting; do not accidentally count UTF-16 code units or promise grapheme counting. serviceId is UUID. Plain text only; render escaped. Body limit 32 KiB. Normalize before validation consistently and test whitespace-only input.

Server assigns UUID, membership-authorized workspace, reporter from session, reported state, revision 1 and UTC createdAt/updatedAt. No user-supplied timestamps or transitions in Phase 1.

Workspace membership is active/revoked; every read/write checks it. Service must belong to the selected workspace and be active. Authentication proves identity; it does not grant workspace access.

## Phase 1 API

| Method/path | Purpose | Success |
|---|---|---|
| POST /api/v1/workspaces/:workspaceId/incidents | Create within authorized workspace | 201; Location header; Incident DTO |
| GET /api/v1/workspaces/:workspaceId/incidents | Permitted list | 200; items + nextCursor |
| GET /api/v1/workspaces/:workspaceId/incidents/:incidentId | Permitted detail | 200; Incident DTO |
| GET /api/v1/me | Safe identity/membership view | 200 |

Auth package endpoints are mounted separately at /api/auth; package-specific auth errors are not falsely documented as OpsLedger's custom envelope. Preserve cookies correctly. Build upstream URLs from a configured trusted base, not an arbitrary Host header. Prefer same-origin SPA/API; explicit trusted dev origin only.

Incident DTO: id, workspaceId, serviceId, reporterId, title, description, severity, state, revision, createdAt, updatedAt. No password hash, session token or internal auth/account fields.

List uses pageSize 1–50 (default 20) and opaque validated cursor, ordered createdAt DESC, id DESC. Cursor binds workspace/identity/filter scope; unauthorized identity never gains access by replaying another user's cursor. Use parameterized SQL and bounded cursor length. Subsequent pages are eventually consistent under writes; Phase 1 does not promise snapshot pagination. No sort/filter feature expansion beyond this contract.

401 for absent/invalid session. 404 for inaccessible workspace/object/service and nonexistent resources, to reduce object enumeration. 403 for known accessible object but forbidden action. 400 for malformed syntax/schema/cursor. 413 for body limit. 429 for enforced limit. 503 for DB unavailable; 500 for unexpected internal failure. Do not leak SQL, stack or protected IDs.

Error DTO: error { code, message, requestId, details? }. details is an optional safe list of field/code pairs for validation only. API requestId is server-generated or tightly validated; never log raw arbitrary headers.

## Authorization matrix

| Actor in active workspace | Create | List/detail | Change lifecycle | Membership changes |
|---|---|---|---|---|
| Reporter | Yes | Own incidents, plus explicitly workspace-visible records | No Phase 1 endpoint | No |
| Responder | Yes | Workspace-visible operational records | Phase 2 scoped actions only | No |
| Incident lead | Yes | Workspace-visible operational records | Phase 2 scoped lead actions | No |
| Knowledge editor | Yes as reporter | Own or workspace-visible records | No implicit lead rights | No |
| Workspace admin | Yes | Workspace-visible; private object policy still applies | No implicit lead rights | Later authorized admin scope |
| Revoked/nonmember/other workspace | No | No | No | No |

Phase 1 creates incidents with workspace visibility. Role-specific restricted visibility is introduced only with its explicit phase scope. Test the reporter ownership policy using prepared fixtures so later visibility changes do not create accidental privilege expansion. Roles are memberships, not client claims.

## Full lifecycle specification for Phase 2, documentation only

reported → triaged: responder/lead, valid assignment.
triaged → investigating: responder/lead, assigned active responder.
investigating → resolved: lead, resolution summary 10–5000 characters.
resolved → closed: lead; existing resolution.
resolved/closed → investigating: lead, mandatory reopen reason.
All others denied. Workspace membership/object permissions apply before transitions. Assignment to inactive/nonmember user denied.

Every mutation after Phase 1 supplies expectedRevision; mismatch returns 409 revision_conflict without writes. State/comment/activity/audit changes that represent one domain action commit atomically. Phase 1 exposes revision but does not implement update endpoints. Audit and async behavior are documented now, implemented only in their authorized phases.

## Synthetic fixtures

Use fictional workspaces NorthLab and SouthLab and fictional services InvoiceWorker and NotificationGateway. Emails use reserved example.test. Seed reporter/other reporter/responder/lead/editor/admin and revoked membership fixtures per workspace. Generate temporary passwords/secrets at runtime; never publish usable default credentials. Do not use family, employer or real customer data.

## Phase 1 acceptance matrix

| ID | Assertion | Layer / evidence |
|---|---|---|
| AC01 | Valid create returns 201, server fields correct, DB persists | API + DB |
| AC02 | Reload browser finds created incident | One isolated Playwright flow |
| AC03 | Boundary lengths, Unicode, whitespace, enums and unknown fields rejected correctly | Domain + API |
| AC04 | No session, expired or revoked session rejected | API + auth integration |
| AC05 | Other workspace/member and guessed incident IDs cannot disclose data | API security matrix |
| AC06 | Inactive/foreign service denied; no partial row | API + DB |
| AC07 | Safe DTO excludes auth internals | Independent field assertion |
| AC08 | Equal timestamp pagination has stable tie breaker; no repeats | API + fixed dataset |
| AC09 | Malformed/oversized cursor/body fails safely | API |
| AC10 | DB outage returns bounded safe failure with correlation | Integration + logs |
| AC11 | Logout/revocation invalidates subsequent access | API + browser subset |
| AC12 | Trusted origin rules hold; reflected Host does not become auth base | Auth boundary tests |
| AC13 | Create spoofing reporter/role/state/workspace is rejected | Negative API |
| AC14 | Keyboard/labels/loading/empty/error states usable | Manual + focused browser checks |

No AI test/eval gate applies to Phase 1. No application behavior above has been implemented or tested by Phase 0's probe.

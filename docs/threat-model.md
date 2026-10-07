# Initial Threat Model

Assets: session credentials, membership authority, incident content, DB integrity, migrations, seed secrets and CI artifacts. Actors: legitimate user, cross-workspace user, unauthenticated attacker, malicious PR author and compromised dependency.

| Boundary/abuse | Enforcing control | Required evidence |
|---|---|---|
| Browser → API spoofed role/workspace | Strict DTO + session membership policy | AC05/13 |
| Session theft/CSRF | HttpOnly, deployed Secure cookie, same-origin policy, origin controls, revocation | AC04/11/12 |
| ID guessing/list leakage | All queries workspace/object scoped | AC05 |
| SQL injection | Parameterized Drizzle/pg queries | Payload DB test |
| Stored XSS | Plain escaped rendering; no raw HTML | Browser fixture |
| Resource abuse | Body/cursor/page limits and auth rate limits | Limit/concurrency tests |
| Host-header spoof | Configured auth baseURL | AC12 |
| Secrets/log leakage | Log redaction and safe error DTO | Canary check |
| Migration/seed misuse | Dedicated migration role; runtime least privilege; lab profile not prod | Config/DB review |
| Malicious CI code | No secrets on untrusted PRs; SHA-pinned actions; read-only token | Workflow review |
| Dependency compromise | Exact pins/integrity, reviewed scripts/advisories | Lockfile/audit |

No AI trust boundary exists in the implemented Phase 0 probe. Future AI risks stay in the approved roadmap; they do not justify loading AI packages now.

Failure injection/reset routes must not register outside lab mode, and startup rejects production combined with lab/reset flags. Network isolation alone does not justify unrestricted test routes.

Security review is evidence-based: an advisory index read is not a full dependency audit; npm audit may contain stale/incomplete findings and is not an exploitability proof.

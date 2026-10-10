# Architecture and authority

[Portfolio entry point](../../README.md) · [Claims](claims.md) · [Detailed M4 flows](../m4-architecture.md)

## Product path

```mermaid
flowchart TD
  UI["React / Vite UI"] --> API["Fastify REST API"]
  API --> Rules["Session, workspace ACL and domain rules"]
  Rules --> DB["PostgreSQL: incidents, runbooks and outbox"]
  DB --> Worker["pg-boss worker: registered jobs"]
  Worker --> DB
  Tests["Playwright, API and concurrency tests"] --> API
```

The modular monolith keeps policy close to domain transactions. The worker is a distinct process, not a second policy authority. Trusted registered test code can exercise synthetic product mutations; model output cannot perform operational incident mutation.

## Local AI / RAG path

```mermaid
flowchart TD
  Input["Authorized product request"] --> Gate["Feature flag, identity and limits"]
  Gate --> Retrieval["Scoped chunks and embeddings"]
  Retrieval --> Context["Bounded context and provenance"]
  Context --> Model["Local Ollama model"]
  Model --> Contract["Schema and citation checks"]
  Contract --> Review["Assistance for human review"]
  Gate --> Model
```

Retrieval integrity and citation validation are mechanical checks, not proof of answer truth. Product semantic search is distinct from experimental QA retrieval, which was rejected for default adoption. No external live model run is needed to read the accepted observations.

## QA control plane

```mermaid
flowchart TD
  Request["Change and bounded identity"] --> Policy["TypeScript registry and deterministic policy"]
  Policy --> Runner["Registered suites in constrained runner"]
  Runner --> Receipt["SHA-bound checks and receipt"]
  Receipt --> State["Durable workflow state"]
  State --> Human["Human action-specific approval"]
  Human --> Guard["Recheck SHA, identity, expiry and consumption"]
  Guard --> Effect["Store one local report"]
  AI["AI triage / MCP tools / optional specialists"] --> Policy
```

Failed required checks cannot be approved. Approval is bound to the action, receipt, SHA, identity and expiry, and is one-time consumable. The check-to-effect expiry test covers the TOCTOU window. Nothing in this diagram authorizes merge or release. Phase 19 artifact review is a review record, not this approval or a side effect.

## n8n → TypeScript boundary

```mermaid
flowchart TD
  Human["Operator-selected existing run"] --> N8N["n8n bounded orchestration"]
  N8N --> Bridge["Signed request and bounded HTTP bridge"]
  Bridge --> TS["TypeScript identity, policy and state checks"]
  TS --> Deny["Deny stale, invalid or unauthorized requests"]
  TS --> Existing["Inspect existing evidence / bounded report effect"]
  Existing --> N8N
```

The export contains credential references, not credential values. A signed message does not bypass required checks. n8n Community/self-hosted is not an OS sandbox. Application egress denial does not establish process isolation or exactly-once transport.

## Phase 19 change-to-evidence path

```mermaid
flowchart TD
  Change["SHA-bound change risk"] --> Suites["Minimum suites plus risk additions"]
  Suites --> Execute["Registered deterministic execution"]
  Execute --> Evidence["Verified receipts and artifacts"]
  Evidence --> Triage["Bounded triage and eval"]
  Triage --> Review["Human review record"]
  Execute --> Inconclusive["Environment failure: inconclusive"]
  Triage --> Inconclusive
  Evidence --> Fail["Required failure dominates AI verdict"]
```

The accepted smoke ran real registered checks against synthetic change inputs; triage/review were fixture driven. It demonstrated a bounded evidence chain, not live model quality or human understanding. Browser-use and patch-proposal complexity were deferred because no demonstrated gap required them.

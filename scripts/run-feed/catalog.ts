// Skill catalog for the public run feed (docs/run-feed.md).
// Every CI test file, harness step and browser flow belongs to exactly one skill;
// tests/run-feed.unit.test.ts fails when a test file or browser spec is left unmapped.

/**
 * `deterministic`: no model involved. `fixture`: AI contract exercised with synthetic or hand-written model output.
 * `recorded`: real output of the pinned local model, recorded on the desktop and replayed exactly; CI never calls a model.
 */
export type Provenance = 'deterministic' | 'fixture' | 'recorded';

export type Skill = {
  id: string;
  name: string;
  tool: string;
  provenance: Provenance;
  note: string;
  /** node:test files (basename) whose results belong to this skill. */
  files: string[];
  /** record-step ids whose results belong to this skill. */
  steps: string[];
  /** Playwright flows (spec basename without .spec.ts). */
  flows: string[];
};

export const SKILLS: Skill[] = [
  {
    id: 'product-contracts',
    name: 'Product contracts & data integrity',
    tool: 'node:test · Fastify · PostgreSQL',
    provenance: 'deterministic',
    note: 'Incident domain rules, lifecycle transitions, workspace isolation, outbox and knowledge versioning against a real database.',
    files: [
      'domain.test.ts',
      'lifecycle.domain.test.ts',
      'knowledge.domain.test.ts',
      'async.domain.test.ts',
      'client.unit.test.ts',
      'integration.test.ts',
      'lifecycle.integration.test.ts',
      'lifecycle-outbox.integration.test.ts',
      'knowledge.integration.test.ts',
      'async.integration.test.ts',
      'quality.integration.test.ts',
    ],
    steps: ['quality-baseline'],
    flows: [],
  },
  {
    id: 'browser-e2e',
    name: 'Product UI end to end',
    tool: 'Playwright · Chromium · axe',
    provenance: 'deterministic',
    note: 'Each flow starts its own server lifetime; the lifecycle regression is repeated on five fresh lifetimes with no retries.',
    files: [],
    steps: ['lifecycle-trial-1', 'lifecycle-trial-2', 'lifecycle-trial-3', 'lifecycle-trial-4', 'lifecycle-trial-5'],
    flows: ['incident', 'knowledge', 'lifecycle', 'async', 'quality', 'flags'],
  },
  {
    id: 'structured-output',
    name: 'Structured output contracts',
    tool: 'Zod strict JSON · local model client',
    provenance: 'fixture',
    note: 'Model output must match a strict schema or the request fails closed; refusals and abstentions are part of the contract.',
    files: ['structured-output.unit.test.ts', 'local-model.unit.test.ts', 'assistance.integration.test.ts'],
    steps: [],
    flows: ['assistance'],
  },
  {
    id: 'rag-retrieval',
    name: 'RAG, embeddings & citations',
    tool: 'pgvector · embeddings · cited answers',
    provenance: 'fixture',
    note: 'Retrieval, citation spans and source versions are checked with fixed vectors; generation quality is not claimed here.',
    files: ['embeddings.unit.test.ts', 'retrieval.integration.test.ts', 'rag.integration.test.ts'],
    steps: ['m2-harness'],
    flows: ['retrieval', 'rag'],
  },
  {
    id: 'retrieval-quality',
    name: 'Retrieval quality (golden set)',
    tool: 'embeddinggemma vectors · pgvector · 50 labelled queries',
    provenance: 'recorded',
    note: 'Real embeddings of the pinned model, recorded on the desktop and replayed through the production index and search: Recall@k, MRR, nDCG, citable span and abstention on a held-out split, with no leaks of withdrawn, superseded or other-workspace content.',
    files: ['retrieval-golden.integration.test.ts', 'retrieval-golden.unit.test.ts'],
    steps: [],
    flows: [],
  },
  {
    id: 'prompt-injection-evals',
    name: 'Prompt-injection & eval regression',
    tool: 'Promptfoo · deterministic graders · egress guard',
    provenance: 'fixture',
    note: 'Adversarial and boundary cases replayed against reviewed fixtures with network egress denied.',
    files: [],
    steps: ['ai-regression'],
    flows: [],
  },
  {
    id: 'agent-budgets',
    name: 'Agent budgets & tool boundaries',
    tool: 'Bounded agent loop · tool registry',
    provenance: 'fixture',
    note: 'Turn, deadline and token budgets; untrusted tool text is data, never policy; no execution or approval authority.',
    files: ['qa-agent.unit.test.ts', 'qa-m3.integration.test.ts'],
    steps: ['agent-eval'],
    flows: [],
  },
  {
    id: 'mcp-contract',
    name: 'MCP read-only server',
    tool: 'Model Context Protocol · stdio and HTTP',
    provenance: 'deterministic',
    note: 'Tools, resources and prompts of the opsledger-qa-readonly server, including cancellation and transport failures.',
    files: ['qa-mcp.integration.test.ts'],
    steps: [],
    flows: [],
  },
  {
    id: 'agent-observability',
    name: 'Agent observability (OpenTelemetry GenAI)',
    tool: 'OpenTelemetry · GenAI semantic conventions · trace-based tests',
    provenance: 'fixture',
    note: 'Agent runs, model calls, embeddings, retrieval and MCP tool calls emit gen_ai spans; tests assert the trajectory on the spans and that no prompt or source text is exported.',
    files: ['agent-tracing.unit.test.ts'],
    steps: [],
    flows: [],
  },
  {
    id: 'context-engineering',
    name: 'Context engineering & provenance',
    tool: 'Budgeted retrieval · SHA-bound sources',
    provenance: 'fixture',
    note: 'Ranked context under a character budget, with model, digest and chunk-version provenance for every source.',
    files: ['qa-context.unit.test.ts'],
    steps: ['m4-harness'],
    flows: [],
  },
  {
    id: 'human-approval',
    name: 'Human approval gates & durable workflow',
    tool: 'SHA-bound approvals · crash recovery',
    provenance: 'deterministic',
    note: 'Approvals are bound to action, commit, identity and expiry, consumed once, and survive process crashes and restarts.',
    files: [
      'qa-state.integration.test.ts',
      'qa-workflow.integration.test.ts',
      'qa-crash.integration.test.ts',
      'qa-api.integration.test.ts',
      'qa-runner.integration.test.ts',
      'feedback.integration.test.ts',
    ],
    steps: [],
    flows: ['qa'],
  },
  {
    id: 'orchestration',
    name: 'Signed orchestration with n8n',
    tool: 'n8n Community · HMAC webhooks',
    provenance: 'deterministic',
    note: 'Signed, versioned webhooks with duplicate recovery and an error branch, run against an actual n8n instance.',
    files: ['qa-orchestration.integration.test.ts'],
    steps: ['n8n-smoke'],
    flows: [],
  },
  {
    id: 'specialists-pipeline',
    name: 'Specialist comparison & QA pipeline',
    tool: 'Paired comparison · registered suites',
    provenance: 'fixture',
    note: 'Specialist contracts and the paired comparison harness on fixtures; the live comparison is recorded locally below.',
    files: ['qa-specialists.unit.test.ts', 'qa-pipeline.unit.test.ts'],
    steps: ['specialist-fixture', 'pipeline-smoke'],
    flows: [],
  },
  {
    id: 'supply-chain',
    name: 'Supply chain & build integrity',
    tool: 'npm audit gate · Prettier · ESLint · TypeScript',
    provenance: 'deterministic',
    note: 'Formatting, lint, typecheck and build, plus a fail-closed audit gate with scoped, expiring exceptions (ADR 0019).',
    files: ['audit-gate.unit.test.ts', 'run-feed.unit.test.ts'],
    steps: ['static-checks', 'audit-gate'],
    flows: [],
  },
];

/** Human-readable command per step, shown in the replay. */
export const STEP_COMMANDS: Record<string, string> = {
  'static-checks': 'npm run format:check && npm run lint && npm run typecheck && npm run build',
  'audit-gate': 'node scripts/audit-gate.ts',
  'quality-baseline': 'npm run quality:baseline',
  'm2-harness': 'M2_BUNDLE_FIXTURE=true npm run ai:m2-harness',
  'ai-regression': 'npm run ai:regression',
  'agent-eval': 'npm run agent:eval',
  'm4-harness': 'M4_BUNDLE_FIXTURE=true npm run ai:m4-harness',
  'n8n-smoke': 'npm run m5:n8n-smoke',
  'specialist-fixture': 'npm run m5:specialist-fixture',
  'pipeline-smoke': 'npm run m5:pipeline-smoke',
};

export const LANES: Record<string, string> = {
  api: 'API lane · PostgreSQL 18.6 + pgvector',
  browser: 'Browser lane · Chromium',
  windows: 'Windows',
};

/**
 * Live local-model runs on the author's desktop, already committed as evidence.
 * They are not part of any CI run; the feed lists them separately and the site labels them so.
 */
export type RecordedSource = { id: string; title: string; file: string; finding: string };
export const RECORDED_LOCAL: RecordedSource[] = [
  {
    id: 'm2-rag',
    title: 'M2 · Local RAG answers with Qwen3 8B',
    file: 'evidence/m2-human-desktop-validation.json',
    finding:
      'Retrieval found the right runbook every time; generations still needed human review, and AI stays optional next to direct reading.',
  },
  {
    id: 'm4-context',
    title: 'M4 · Retrieval-augmented QA context',
    file: 'evidence/m4-human-checkpoint.json',
    finding:
      'Provenance and integrity worked, but correct retrieval did not reliably improve reasoning, so retrieval is not adopted by default.',
  },
  {
    id: 'm5-specialists',
    title: 'M5 · Specialists versus direct mode',
    file: 'evidence/m5-specialist-comparison-desktop.json',
    finding:
      'No demonstrated semantic advantage for specialists at roughly three times the provider calls, so they are not adopted by default.',
  },
];

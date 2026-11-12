# Retrieval golden set: real embeddings, replayed in CI

The fixture retrieval tests (`tests/retrieval.integration.test.ts`, the M2 harness) use synthetic lexical vectors:
they prove the index, filters and citations work, not that the embedding model retrieves the right runbook. The
golden set measures that, without a GPU in CI:

1. **Record once on the desktop.** `npm run rag:golden:record` embeds every chunk and query of the golden set with
   the pinned `embeddinggemma:300m` through the production `OllamaEmbeddings` provider and writes
   `tests/fixtures/retrieval-golden-v1/embeddings.json`.
2. **Replay everywhere.** `npm run rag:golden` loads the corpus into PostgreSQL + pgvector through the production
   write, publish and index path, and searches it with `Retrieval.search`. A replay provider returns the recorded
   vector for each text. Search is exact cosine, and vectors are stored as float32 exactly as pgvector keeps them, so
   the ranking is the one the model produced, run after run.

CI never calls a model. In the run feed this skill is marked `recorded`: real model output, replayed.

## The dataset (`tests/fixtures/retrieval-golden-v1/`)

`corpus.json` holds 20 synthetic runbooks with hard cases on purpose:

| Case | Runbooks | What must hold |
| --- | --- | --- |
| Near-duplicate pairs | r02 database restore / r03 file restore; r05 database password / r06 API keys | The right one ranks first |
| Superseded version | r18: v1 said to delete rows, v2 says to requeue | v1 text is never returned |
| Withdrawn runbook | r19 | Never returned |
| Other workspace | r20, a South copy of r01 | Never returned to a North reporter |
| Later chunk | r17, a long drill runbook | Answers sit in the second chunk |
| Spanish runbooks | r15, r16 | Found from English queries too |

`queries.json` holds 50 queries in English and Spanish: lexical, paraphrase, cross-lingual, hard-negative, symptom,
multi-chunk, superseded and no-answer. Each answerable query names the answering runbook (grade 2), optional related
runbooks (grade 1) and the exact `evidence` a cited answer would quote. No-answer queries have no published answer
in the workspace (one only matches the withdrawn runbook). The `development` split (24) tunes the abstention
threshold; the `held-out` split (26) is only measured.

`tests/retrieval-golden.unit.test.ts` validates the dataset: every evidence string exists verbatim in the answering
runbook, every answer is retrievable by the North reporter, obsolete text exists only in the superseded version.

## Metrics (`evidence/phase21-retrieval-golden.json`)

Per split, over answerable queries: Recall@1/3/5 and MRR on the answering runbook, graded nDCG@5 over distinct
runbooks, and **citable span@5** — a top-5 chunk of the answering runbook contains the evidence text. The same queries
run through a keyword baseline (any query term, `ts_rank_cd`) for comparison. Abstention: a threshold on the top
cosine score, tuned on `development` for balanced accuracy and reported on `held-out` as no-answer recall, precision
and answerable coverage. Breakdowns by query type and language are included. Only identities, ranks and scores are
written — never vectors, prompts or model output.

## Gates

- The dataset is valid.
- The recording matches the dataset: `corpus.json`, `queries.json` and the chunker are hashed in the manifest. If any
  of them changes, the test fails and asks for a new recording instead of replaying stale vectors.
- Search never returns withdrawn, superseded or other-workspace content.
- Once `baseline.json` is committed for a recording, no gated metric may drop below it (development and held-out
  Recall@k, MRR, nDCG@5, citable span; held-out no-answer recall and coverage). Replay is deterministic, so any drop
  is a real regression in indexing or search.

Without a recording the replay is reported as skipped, never as passed.

## Recording on the desktop (Windows)

Use the same private `.env` as the M2 desktop run (`EMBEDDINGS_ENABLED`, `EMBEDDING_MODEL=embeddinggemma:300m`, the full
`EMBEDDING_DIGEST`, `OLLAMA_EXPECTED_VERSION`). No database is needed to record.

```powershell
git fetch origin
git switch feat/retrieval-golden-set
git pull --ff-only
npm ci --ignore-scripts
ollama --version
(Invoke-RestMethod http://127.0.0.1:11434/api/tags).models | Where-Object name -eq 'embeddinggemma:300m' | Select-Object name,digest
npm run rag:golden:record
```

The script refuses to run if the Ollama version differs from `OLLAMA_EXPECTED_VERSION` or the installed digest
differs from `EMBEDDING_DIGEST`. It writes only `tests/fixtures/retrieval-golden-v1/embeddings.json`.

Optionally replay locally (embedded PGlite, no Docker needed): `npm run rag:golden`. Then commit and push the
recording; CI replays it on native PostgreSQL 18.6 with pgvector. After the first green run, the measured metrics
become `baseline.json`.

Re-record whenever the corpus, the queries, the chunker or the embedding model changes, and update the baseline in
the same pull request with the reason.

## Limitations

- A small synthetic corpus written for this test, not production runbooks; one model, one recording, no confidence
  intervals.
- Retrieval only. Whether a generated answer is supported by its citations is evaluated by the RAG contract tests and
  the M2 human review, not here.
- The abstention threshold is a property of this corpus and model, not a production setting.

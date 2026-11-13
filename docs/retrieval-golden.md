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
run through a keyword baseline (any query term, `ts_rank_cd`, ties broken by title so it is reproducible) for comparison. Abstention: a threshold on the top
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

## Results of the first recording

`embeddinggemma:300m` (`sha256:85462619…`, the same digest as M2), Ollama 0.40.3 — not the 0.34.0 of the M2–M5 runs —
on an RTX 4070 Ti SUPER. Full per-query results: `evidence/phase21-retrieval-golden.json`.

| Split | Recall@1 | Recall@5 | MRR | nDCG@5 | Citable span@5 | Keyword Recall@5 | Keyword MRR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| development (21 answerable) | 1.00 | 1.00 | 1.00 | 0.998 | 1.00 | 0.86 | 0.50 |
| held-out (23 answerable) | 0.96 | 1.00 | 0.97 | 0.975 | 1.00 | 0.65 | 0.43 |

What it shows:

- **Ranking is strong where keywords fail.** All 8 cross-lingual queries rank the answer first (keyword baseline: 0 of 8);
  paraphrases 12 of 12 first (keyword Recall@5 0.75). Every answer's citable span is in the top 5.
- **One hard negative ranks wrong.** "a bad migration corrupted rows, roll the database back to just before it" puts
  the deployment rollback runbook first; the point-in-time database restore is fourth.
- **The score threshold does not detect out-of-scope questions.** Tuned on development (0.332), it separated
  development perfectly, but on held-out it abstained on none of the 3 no-answer queries and on 2 answerable ones.
  Development's no-answer queries were off-domain (a printer, a wallpaper, a domain registration) and scored 0.17–0.28;
  held-out's were in-domain near misses (SSH host keys, rebooting the cluster, Kafka lag) and scored 0.36–0.42, above
  the weakest correct answers (0.28). A top-cosine threshold is therefore **not adopted** as an abstention mechanism.

Because the held-out results have now been seen, they must not be used to retune the threshold or the splits. A
`retrieval-golden-v2` should add in-domain no-answer queries to development and a fresh held-out set.

## Hybrid search (RRF) on v1 (2026-11-13)

`Retrieval.search(…, 'hybrid')` fuses the exact-cosine ranking with a PostgreSQL full-text ranking of the chunk text by
Reciprocal Rank Fusion (k = 60, 20 candidates from each). Authorization, publication, version, model and index filters
are the same in both modes, and `score` stays the cosine similarity, so thresholds keep their meaning. Semantic search
remains the default; hybrid is opt-in and measured next to it on the same replayed index.

| v1, held-out (n = 23) | Recall@1 | Recall@5 | MRR | nDCG@5 |
| --- | --- | --- | --- | --- |
| Semantic (default) | 0.957 | 1.000 | 0.967 | 0.975 |
| Hybrid, plain keyword terms | 0.609 | 0.913 | 0.712 | 0.761 |
| Hybrid, stopwords removed (chosen on development) | 0.826 | 0.957 | 0.871 | 0.892 |

**Finding: on this corpus, naive hybrid search hurts.** The `simple` text-search config keeps function words ("the",
"para"), which match nearly every chunk and flood the keyword ranking; removing English and Spanish stopwords, chosen
on the development split only, recovered most of the loss. The rest is structural: semantic search already ranks every
v1 lexical query first, so the keyword channel can only add noise, and it hurts most on cross-lingual queries (Recall@1
1.00 → 0.50), where Spanish words match English text by accident. Hybrid is not adopted; its metrics are gated in
`baseline.json` so a change to it is still measured.

## Golden set v2 (`tests/fixtures/retrieval-golden-v2/`)

v1 has no query that semantic search gets wrong for lexical reasons, so it cannot show where keyword search helps. v2
keeps all of v1 and adds:

- **r21–r26**, pairs of runbooks that differ mainly by an identifier: SQLSTATE 53300 vs 53400, `max_wal_size` vs
  `wal_keep_size`, Redis `OOM … maxmemory` vs `LOADING`.
- **10 identifier queries** (4 development, 6 held-out), such as `SQLSTATE 53300` or `raise wal_keep_size`.
- **7 in-domain no-answer questions** (3 development, 4 held-out) that use the corpus vocabulary but are not answered,
  such as upgrading PostgreSQL with `pg_upgrade`. v1's abstention could not separate these from answerable questions.

The new held-out queries were written before any v2 measurement. Record v2 on the desktop with the same procedure:

```powershell
npm run rag:golden:record -- --set v2
npm run rag:golden
git add tests/fixtures/retrieval-golden-v2/embeddings.json evidence/retrieval-golden-v2.json
git commit -m "evidence: record retrieval golden set v2"
git push
```

## Results of the v2 recording (2026-11-13)

Same model, digest, runtime and machine as v1. Report: [`evidence/retrieval-golden-v2.json`](../evidence/retrieval-golden-v2.json).

| v2 | Semantic Recall@1 | Hybrid Recall@1 | Semantic MRR | Hybrid MRR |
| --- | --- | --- | --- | --- |
| Development (n = 25) | 0.96 | 0.88 | 0.980 | 0.903 |
| Held-out (n = 29) | 0.931 | 0.828 | 0.957 | 0.876 |
| Identifier queries (n = 10) | 0.90 | 0.90 | 0.950 | 0.950 |

**Finding: the embedding model already handles identifiers, so hybrid search still does not pay off.** Semantic search
ranked the right runbook first for 9 of 10 identifier queries, including both SQLSTATE pairs; hybrid matched it and
lost elsewhere. The one miss, `raise wal_keep_size`, defeats both: the full-text parser splits `wal_keep_size` into
`wal`, `keep`, `size`, which the `max_wal_size` runbook also contains.

**Finding: a score threshold cannot abstain on in-domain questions.** Tuned on development (0.496), held-out abstention
caught 6 of 7 no-answer questions but also refused 41% of answerable ones (balanced accuracy 0.72). In-domain questions
without an answer score 0.40–0.52, inside the range of answerable ones. Retrieval scores say "related", not "answers
it"; abstention stays with the grounded-citation check of the RAG answer, which refuses claims without a verbatim quote.

**Decision:** semantic search stays the default; hybrid stays opt-in and gated. A reranker is not added: ranking is
already at 0.93–0.96 Recall@1, and the open problem, deciding whether a source answers the question, is the one the
citation validator already owns.

## Limitations

- A small synthetic corpus written for this test, not production runbooks; one model, one recording, no confidence
  intervals.
- Retrieval only. Whether a generated answer is supported by its citations is evaluated by the RAG contract tests and
  the M2 human review, not here.
- The abstention threshold is a property of this corpus and model, not a production setting.

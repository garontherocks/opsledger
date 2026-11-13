import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import type { z } from 'zod';
import { Knowledge } from './knowledge.ts';
import { HttpError } from './errors.ts';
import { vectorValue, type EmbeddingProvider } from './embeddings.ts';
import { ATTR, inSpan, traceEmbeddings } from './telemetry.ts';
import { ChunkHit, SemanticQuery, type Hit } from '../../../packages/contracts/src/retrieval.ts';
export const INDEX_VERSION = 'chunk-v1-768';
/** Search modes. `semantic` (exact cosine) is the default; `hybrid` fuses it with keyword search (docs/retrieval-golden.md). */
export type SearchMode = 'semantic' | 'hybrid';
/** Reciprocal Rank Fusion constant and candidate pool per ranking (Cormack et al., 2009: k = 60). */
export const RRF_K = 60;
export const RRF_POOL = 20;
/** Keyword query for PostgreSQL full text: distinct letter/digit terms of 3+ characters, ORed. Never raw user syntax. */
/**
 * Function words in the two languages the runbooks and queries use. The `simple` text-search config keeps them, and
 * because they occur in almost every chunk they flood the keyword ranking with noise.
 */
const STOPWORDS = new Set(
  (
    'the and for are but not you all any can had her was one our out has have him his how its may new now old see two who ' +
    'did get let put say she too use what when where which while with this that these those from into onto than then them ' +
    'they their there here been being does doing done each few more most other some such only own same very will would ' +
    'should could about after again against before below between both down during further once over under until why ' +
    'que los las del con por para una uno unos unas como más pero sus les ese esa eso esto esta este estos estas entre ' +
    'sobre sin hay muy qué cómo cuál cuándo dónde fue son ser está están tiene tienen hace hacer todo todos también'
  ).split(' '),
);
/** Keyword query for PostgreSQL full text: distinct 3+ character letter/digit terms that are not stopwords, ORed. */
export const keywordQuery = (q: string) =>
  [...new Set(q.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].filter(t => !STOPWORDS.has(t)).join(' | ');
export function chunks(body: string) {
  if (body.length < 10 || body.length > 10000 || body.includes('\0'))
    throw new HttpError(413, 'ingestion_budget', 'Unsupported runbook body');
  const result: { start: number; end: number; text: string }[] = [];
  for (let start = 0; start < body.length;) {
    let end = Math.min(start + 1000, body.length);
    if (end < body.length) {
      const newline = body.lastIndexOf('\n', end);
      if (newline > start + 600) end = newline + 1;
      if (/[\uD800-\uDBFF]/.test(body[end - 1]!)) end--;
    }
    result.push({ start, end, text: body.slice(start, end) });
    if (end === body.length) break;
    start = end - 120;
    if (/[\uDC00-\uDFFF]/.test(body[start]!)) start--;
  }
  if (result.length > 16) throw new HttpError(413, 'ingestion_budget', 'Chunk budget exceeded');
  return result;
}
export class Retrieval {
  private knowledge: Knowledge;
  private active = false;
  pool: Pool;
  provider: EmbeddingProvider;
  constructor(pool: Pool, secret: string, provider: EmbeddingProvider) {
    this.pool = pool;
    this.knowledge = new Knowledge(pool, secret);
    this.provider = provider;
  }
  private async source(user: string, workspace: string, id: string) {
    await this.knowledge.role(user, workspace);
    const r = await this.pool.query(
      "SELECT r.revision,r.workspace_id,v.* FROM runbooks r JOIN runbook_versions v ON v.runbook_id=r.id AND v.number=r.published_version WHERE r.id=$1 AND r.workspace_id=$2 AND v.status='published'",
      [id, workspace],
    );
    if (!r.rowCount) throw new HttpError(404, 'not_found', 'Published source unavailable');
    return r.rows[0];
  }
  async index(user: string, workspace: string, id: string, revision: number) {
    if (!['editor', 'admin'].includes(await this.knowledge.role(user, workspace)))
      throw new HttpError(403, 'forbidden_action', 'Knowledge editor required');
    if (this.active) throw new HttpError(429, 'index_busy', 'Index operation busy');
    this.active = true;
    try {
      const source = await this.source(user, workspace, id);
      if (source.revision !== revision) throw new HttpError(409, 'revision_conflict', 'Source changed');
      const parts = chunks(source.body),
        vectors: number[][] = [];
      // No database connection or transaction is held during inference.
      for (let i = 0; i < parts.length; i += 4) {
        const batch = parts.slice(i, i + 4);
        const output = await traceEmbeddings(this.provider.model, batch.length, 'document', () =>
          this.provider.embed(
            batch.map(p => p.text),
            'document',
          ),
        );
        if (output.length !== batch.length) throw new HttpError(503, 'embedding_invalid', 'Embedding count mismatch');
        vectors.push(...output.map(vectorValue));
      }
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const member = await client.query(
          'SELECT role FROM memberships WHERE user_id=$1 AND workspace_id=$2 AND active=true FOR SHARE',
          [user, workspace],
        );
        if (!member.rowCount || !['editor', 'admin'].includes(member.rows[0].role))
          throw new HttpError(403, 'forbidden_action', 'Knowledge editor required');
        const current = await client.query(
          'SELECT revision,published_version FROM runbooks WHERE id=$1 AND workspace_id=$2 FOR UPDATE',
          [id, workspace],
        );
        if (
          !current.rowCount ||
          current.rows[0].revision !== revision ||
          current.rows[0].published_version !== source.number
        )
          throw new HttpError(409, 'revision_conflict', 'Source changed during embedding');
        await client.query('DELETE FROM knowledge_chunks WHERE runbook_id=$1', [id]);
        for (const [i, p] of parts.entries())
          await client.query(
            'INSERT INTO knowledge_chunks(id,runbook_id,version,content_hash,model,digest,index_version,start_offset,end_offset,chunk_text,embedding) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::vector)',
            [
              crypto.randomUUID(),
              id,
              source.number,
              source.content_hash,
              this.provider.model,
              this.provider.digest,
              INDEX_VERSION,
              p.start,
              p.end,
              p.text,
              JSON.stringify(vectors[i]),
            ],
          );
        await client.query('COMMIT');
        return {
          chunks: parts.length,
          version: source.number,
          contentHash: source.content_hash,
          indexVersion: INDEX_VERSION,
        };
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } finally {
      this.active = false;
    }
  }
  async purge(user: string, workspace: string, id: string, revision: number) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const member = await client.query(
        'SELECT role FROM memberships WHERE user_id=$1 AND workspace_id=$2 AND active=true FOR SHARE',
        [user, workspace],
      );
      if (!member.rowCount || !['editor', 'admin'].includes(member.rows[0].role))
        throw new HttpError(403, 'forbidden_action', 'Knowledge editor required');
      const r = await client.query('SELECT revision FROM runbooks WHERE id=$1 AND workspace_id=$2 FOR UPDATE', [
        id,
        workspace,
      ]);
      if (!r.rowCount) throw new HttpError(404, 'not_found', 'Resource not found');
      if (r.rows[0].revision !== revision) throw new HttpError(409, 'revision_conflict', 'Source changed');
      const result = await client.query('DELETE FROM knowledge_chunks WHERE runbook_id=$1', [id]);
      await client.query('COMMIT');
      return { deleted: result.rowCount };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  /** Exact-cosine search inside a `retrieval` span: the query embedding is a child span; only counts are recorded. */
  search(
    user: string,
    workspace: string,
    input: z.infer<typeof SemanticQuery>,
    mode: SearchMode = 'semantic',
  ): Promise<Hit[]> {
    return inSpan(
      'retrieval opsledger-knowledge',
      {
        [ATTR.operation]: 'retrieval',
        [ATTR.dataSource]: 'opsledger-knowledge',
        [ATTR.topK]: input.limit,
        'opsledger.retrieval.mode': mode,
      },
      async span => {
        const hits = await this.searchInSpan(user, workspace, input, mode);
        span.setAttribute('opsledger.retrieval.hits', hits.length);
        return hits;
      },
    );
  }
  private async searchInSpan(
    user: string,
    workspace: string,
    input: z.infer<typeof SemanticQuery>,
    mode: SearchMode,
  ): Promise<Hit[]> {
    await this.knowledge.role(user, workspace);
    const output = await traceEmbeddings(this.provider.model, 1, 'query', () =>
      this.provider.embed([input.q], 'query'),
    );
    if (output.length !== 1) throw new HttpError(503, 'embedding_invalid', 'Embedding count mismatch');
    const query = vectorValue(output[0]);
    await this.knowledge.role(user, workspace);
    // Same authorization, publication, version, model and index filters in both modes.
    const visible = `FROM knowledge_chunks c JOIN runbooks r ON r.id=c.runbook_id JOIN runbook_versions v ON v.runbook_id=c.runbook_id AND v.number=c.version
   WHERE r.workspace_id=$2 AND r.published_version=c.version AND v.status='published' AND v.content_hash=c.content_hash AND c.model=$3 AND c.digest=$4 AND c.index_version=$5 AND ($6::uuid IS NULL OR r.service_id=$6) AND ($7::text IS NULL OR v.category=$7)
   AND EXISTS(SELECT 1 FROM memberships m WHERE m.workspace_id=r.workspace_id AND m.user_id=$8 AND m.active=true)`;
    const params: unknown[] = [
      JSON.stringify(query),
      workspace,
      this.provider.model,
      this.provider.digest,
      INDEX_VERSION,
      input.serviceId ?? null,
      input.category ?? null,
      user,
      input.limit,
    ];
    const rows =
      mode === 'semantic'
        ? await this.pool.query(
            `SELECT c.*,v.title,1-(c.embedding <=> $1::vector) AS score ${visible} ORDER BY c.embedding <=> $1::vector,c.id LIMIT $9`,
            params,
          )
        : // Reciprocal Rank Fusion of the cosine ranking and a full-text ranking of the chunk text. `score` stays the
          // cosine similarity, so thresholds keep their meaning; only the order changes. Ties break on cosine distance.
          await this.pool.query(
            `WITH visible AS (SELECT c.*,v.title,c.embedding <=> $1::vector AS distance,
               CASE WHEN $10 = '' THEN NULL ELSE ts_rank_cd(to_tsvector('simple',c.chunk_text),to_tsquery('simple',$10)) END AS kw,
               CASE WHEN $10 = '' THEN false ELSE to_tsvector('simple',c.chunk_text) @@ to_tsquery('simple',$10) END AS matches ${visible}),
             sem AS (SELECT id,row_number() OVER (ORDER BY distance,id) AS rank FROM visible ORDER BY distance,id LIMIT $11),
             kw AS (SELECT id,row_number() OVER (ORDER BY kw DESC,distance,id) AS rank FROM visible WHERE matches ORDER BY kw DESC,distance,id LIMIT $11)
             SELECT x.*,1-x.distance AS score,COALESCE(1.0/($12+sem.rank),0)+COALESCE(1.0/($12+kw.rank),0) AS rrf
             FROM visible x LEFT JOIN sem ON sem.id=x.id LEFT JOIN kw ON kw.id=x.id WHERE sem.id IS NOT NULL OR kw.id IS NOT NULL
             ORDER BY rrf DESC,x.distance,x.id LIMIT $9`,
            [...params, keywordQuery(input.q), RRF_POOL, RRF_K],
          );
    return rows.rows.map(r =>
      ChunkHit.parse({
        chunkId: r.id,
        runbookId: r.runbook_id,
        version: r.version,
        title: r.title,
        contentHash: r.content_hash,
        start: r.start_offset,
        end: r.end_offset,
        text: r.chunk_text,
        score: r.score,
        model: r.model,
        digest: r.digest,
        indexVersion: r.index_version,
      }),
    );
  }
  async revalidate(user: string, workspace: string, hits: Hit[]) {
    await this.knowledge.role(user, workspace);
    for (const hit of hits) {
      const source = await this.source(user, workspace, hit.runbookId);
      if (
        source.number !== hit.version ||
        source.content_hash !== hit.contentHash ||
        source.body.slice(hit.start, hit.end) !== hit.text
      )
        throw new HttpError(409, 'source_changed', 'Retrieved source changed');
    }
    await this.knowledge.role(user, workspace);
  }
}
export function retrievalHash(hits: Hit[]) {
  return createHash('sha256').update(JSON.stringify(hits)).digest('hex');
}

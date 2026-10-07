import assert from 'node:assert/strict';
import { test } from 'node:test';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import { z } from 'zod';
import { serializerCompiler, validatorCompiler, jsonSchemaTransform, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, text } from 'drizzle-orm/pg-core';
import * as authSchema from './schema.ts';
import { Pool } from 'pg';

// Disposable compatibility probe: no OpsLedger routes or persisted product data.
const Probe = z.strictObject({ value: z.string().min(1).max(20) });

async function buildProbe() {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(swagger, {
    openapi: { openapi: '3.1.0', info: { title: 'Phase 0 probe', version: '0.0.0' } },
    transform: jsonSchemaTransform,
  });
  app.post('/probe', { schema: { body: Probe, response: { 200: Probe } } }, async request => request.body);
  app.get('/invalid-response', { schema: { response: { 200: Probe } } }, async () => ({ value: '' }));
  await app.ready();
  return app;
}

test('Fastify validates Zod input and serializes valid output', async () => {
  const app = await buildProbe();
  try {
    const result = await app.inject({ method: 'POST', url: '/probe', payload: { value: 'valid' } });
    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.json(), { value: 'valid' });
    for (const payload of [{ value: '' }, { value: 'x', role: 'admin' }, { value: 7 }]) {
      assert.equal((await app.inject({ method: 'POST', url: '/probe', payload })).statusCode, 400);
    }
  } finally { await app.close(); }
});

test('Invalid server output is rejected and OpenAPI is generated', async () => {
  const app = await buildProbe();
  try {
    assert.equal((await app.inject('/invalid-response')).statusCode, 500);
    const document = z.object({
      openapi: z.string(),
      paths: z.record(z.string(), z.object({ post: z.object({ requestBody: z.unknown() }).optional() })),
    }).parse(app.swagger());
    assert.equal(document.openapi, '3.1.0');
    assert.ok(document.paths?.['/probe']?.post?.requestBody);
  } finally { await app.close(); }
});

test('Drizzle pg driver emits parameterized SQL without a server', async () => {
  const pool = new Pool({ connectionString: 'postgresql://invalid:invalid@127.0.0.1:1/phase0', connectionTimeoutMillis: 100 });
  const table = pgTable('probe', { id: text('id').primaryKey(), value: text('value').notNull() });
  try {
    const db = drizzle(pool, { schema: authSchema });
    const query = db.insert(table).values({ id: '1', value: "'; DROP TABLE probe;--" }).toSQL();
    assert.ok(query.sql.includes('$1'));
    assert.equal(query.params[1], "'; DROP TABLE probe;--");
    assert.ok(!query.sql.includes('DROP TABLE'));
    const auth = betterAuth({
      baseURL: 'http://localhost:3100',
      secret: 'synthetic-phase0-secret-not-for-deployment-123456',
      database: drizzleAdapter(db, { provider: 'pg' }),
      emailAndPassword: { enabled: true },
      trustedOrigins: ['http://localhost:3100'],
    });
    assert.equal(typeof auth.handler, 'function');
    assert.equal(typeof auth.api.getSession, 'function');
  } finally { await pool.end(); }
});

test('PostgreSQL unavailable produces a bounded connection failure', async () => {
  const pool = new Pool({ connectionString: 'postgresql://invalid:invalid@127.0.0.1:1/phase0', connectionTimeoutMillis: 100 });
  try { await assert.rejects(pool.query('select 1')); }
  finally { await pool.end(); }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import Fastify from 'fastify';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { fromNodeHeaders } from 'better-auth/node';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './schema.ts';

const databaseURL = process.env.PHASE0_TEST_DATABASE_URL;

test('real PostgreSQL migration, auth cookie and revocation', { skip: !databaseURL }, async () => {
  // This test must only receive a disposable Phase 0 database, never product data.
  if (!databaseURL) throw new Error('Missing disposable database URL');
  const target = new URL(databaseURL);
  if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !target.pathname.startsWith('/phase0_')) {
    throw new Error('Only localhost phase0_ disposable databases are allowed');
  }
  const pool = new Pool({ connectionString: databaseURL, connectionTimeoutMillis: 2000 });
  const db = drizzle(pool, { schema });
  const app = Fastify({ logger: false });
  const baseURL = 'http://localhost:3100';
  try {
    const version = await pool.query<{ server_version: string }>('show server_version');
    assert.ok(version.rows[0]?.server_version.startsWith('18.6'), 'Target PostgreSQL patch differs');
    await migrate(db, { migrationsFolder: './migrations' });
    await migrate(db, { migrationsFolder: './migrations' });
    const auth = betterAuth({
      baseURL,
      secret: 'synthetic-live-phase0-only-not-for-deployment-123456',
      database: drizzleAdapter(db, { provider: 'pg' }),
      emailAndPassword: { enabled: true },
      trustedOrigins: [baseURL],
    });
    // Synthetic bootstrap only; final product signup will be closed after seeding.
    const signInEmail = 'login-' + crypto.randomUUID() + '@example.test';
    const password = crypto.randomUUID() + '-Password9!';
    await auth.api.signUpEmail({ body: { name: 'Synthetic Login', email: signInEmail, password } });
    app.route({
      method: ['GET', 'POST'], url: '/api/auth/*',
      async handler(request, reply) {
        const headers = fromNodeHeaders(request.headers);
        const response = await auth.handler(new Request(new URL(request.url, baseURL), {
          method: request.method, headers,
          ...(request.method === 'POST' ? { body: JSON.stringify(request.body) } : {}),
        }));
        reply.code(response.status);
        response.headers.forEach((value, key) => { if (key.toLowerCase() !== 'set-cookie') reply.header(key, value); });
        const cookies = response.headers.getSetCookie();
        if (cookies.length) reply.header('set-cookie', cookies);
        return reply.send(await response.text());
      },
    });
    await app.ready();
    const login = await app.inject({
      method: 'POST', url: '/api/auth/sign-in/email',
      headers: { origin: baseURL }, payload: { email: signInEmail, password },
    });
    assert.equal(login.statusCode, 200, 'Sign in failed');
    const cookie = login.cookies.map(value => value.name + '=' + value.value).join('; ');
    assert.ok(cookie);
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.equal(session?.user.email, signInEmail);
    const denied = await app.inject({
      method: 'POST', url: '/api/auth/sign-out',
      headers: { cookie, origin: 'http://untrusted.example.test' }, payload: {},
    });
    assert.equal(denied.statusCode, 403);
    const logout = await app.inject({
      method: 'POST', url: '/api/auth/sign-out', headers: { cookie, origin: baseURL }, payload: {},
    });
    assert.equal(logout.statusCode, 200);
    assert.equal(await auth.api.getSession({ headers: new Headers({ cookie }) }), null);
  } finally {
    await app.close();
    await pool.end();
  }
});

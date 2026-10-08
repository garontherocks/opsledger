import { z } from 'zod';
import {resolve,isAbsolute} from 'node:path';
export function config(env: NodeJS.ProcessEnv = process.env) {
  const settings=z.object({
    NODE_ENV:z.enum(['development','test','production']).default('development'),
    DATABASE_URL:z.url(),AUTH_SECRET:z.string().min(32),BASE_URL:z.url().default('http://localhost:3100'),
    BIND_HOST:z.enum(['127.0.0.1','0.0.0.0']).default('127.0.0.1'),
    PORT:z.coerce.number().int().min(1).max(65535).default(3100),
    STORAGE_DIR:z.string().refine(isAbsolute).default(resolve('.local/storage')),
    AI_ENABLED:z.enum(['true','false']).default('false'),
    OLLAMA_URL:z.url().refine(value=>{const url=new URL(value);return url.protocol==='http:'&&url.hostname==='127.0.0.1'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash;},'Only a fixed IPv4 loopback Ollama origin is allowed').default('http://127.0.0.1:11434'),
    OLLAMA_MODEL:z.enum(['qwen3:0.6b-q4_K_M','qwen3:1.7b-q4_K_M','qwen3:8b-q4_K_M']).default('qwen3:8b-q4_K_M'),
    OLLAMA_DIGEST:z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
    AI_TIMEOUT_MS:z.coerce.number().int().min(50).max(120000).default(30000),
    READ_ONLY:z.enum(['true','false']).default('false'),
    KNOWLEDGE_ENABLED:z.enum(['true','false']).default('true'),
    ASYNC_ENABLED:z.enum(['true','false']).default('true'),
    LAB_MODE:z.enum(['true','false']).default('false'),
  }).parse(env);
  if(settings.NODE_ENV==='production' && settings.LAB_MODE==='true') throw new Error('Lab mode is forbidden in production');
  if(settings.NODE_ENV==='production' && new URL(settings.BASE_URL).protocol!=='https:') throw new Error('HTTPS required in production');
  if(settings.NODE_ENV==='production'&&!env.STORAGE_DIR)throw new Error('Explicit private STORAGE_DIR required in production');
  if(settings.AI_ENABLED==='true'&&(settings.LAB_MODE!=='true'||settings.NODE_ENV==='production'||!settings.OLLAMA_DIGEST))throw new Error('Phase 6 AI requires nonproduction synthetic lab mode and a pinned local model digest');
  return settings;
}
export type Settings=ReturnType<typeof config>;

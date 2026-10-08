import { z } from 'zod';
import {resolve,isAbsolute} from 'node:path';
export function config(env: NodeJS.ProcessEnv = process.env) {
  const settings=z.object({
    NODE_ENV:z.enum(['development','test','production']).default('development'),
    DATABASE_URL:z.url(),AUTH_SECRET:z.string().min(32),BASE_URL:z.url().default('http://localhost:3100'),
    BIND_HOST:z.enum(['127.0.0.1','0.0.0.0']).default('127.0.0.1'),
    PORT:z.coerce.number().int().min(1).max(65535).default(3100),
    STORAGE_DIR:z.string().refine(isAbsolute).default(resolve('.local/storage')),
    READ_ONLY:z.enum(['true','false']).default('false'),
    KNOWLEDGE_ENABLED:z.enum(['true','false']).default('true'),
    ASYNC_ENABLED:z.enum(['true','false']).default('true'),
    LAB_MODE:z.enum(['true','false']).default('false'),
  }).parse(env);
  if(settings.NODE_ENV==='production' && settings.LAB_MODE==='true') throw new Error('Lab mode is forbidden in production');
  if(settings.NODE_ENV==='production' && new URL(settings.BASE_URL).protocol!=='https:') throw new Error('HTTPS required in production');
  if(settings.NODE_ENV==='production'&&!env.STORAGE_DIR)throw new Error('Explicit private STORAGE_DIR required in production');
  return settings;
}
export type Settings=ReturnType<typeof config>;

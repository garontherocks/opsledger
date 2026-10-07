import { z } from 'zod';
export function config(env: NodeJS.ProcessEnv = process.env) {
  const settings=z.object({
    NODE_ENV:z.enum(['development','test','production']).default('development'),
    DATABASE_URL:z.url(),AUTH_SECRET:z.string().min(32),BASE_URL:z.url().default('http://localhost:3100'),
    PORT:z.coerce.number().int().min(1).max(65535).default(3100),
    LAB_MODE:z.enum(['true','false']).default('false'),
  }).parse(env);
  if(settings.NODE_ENV==='production' && settings.LAB_MODE==='true') throw new Error('Lab mode is forbidden in production');
  if(settings.NODE_ENV==='production' && new URL(settings.BASE_URL).protocol!=='https:') throw new Error('HTTPS required in production');
  return settings;
}
export type Settings=ReturnType<typeof config>;

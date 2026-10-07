import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from './auth-schema.ts';
import type { Settings } from './config.ts';
export function createAuth(pool:Pool,settings:Settings){
  return betterAuth({baseURL:settings.BASE_URL,secret:settings.AUTH_SECRET,
    database:drizzleAdapter(drizzle(pool,{schema}),{provider:'pg'}),
    emailAndPassword:{enabled:true,disableSignUp:true},
    session:{cookieCache:{enabled:false}},
    trustedOrigins:[settings.BASE_URL],
    rateLimit:{enabled:true,window:60,max:30},
    advanced:{useSecureCookies:settings.NODE_ENV==='production',ipAddress:{ipAddressHeaders:['x-opsledger-client-ip']}},
  });
}

import { Pool } from 'pg';
import { config } from './config.ts';
import { Store } from './store.ts';
import { buildApp } from './app.ts';
const settings=config();const pool=new Pool({connectionString:settings.DATABASE_URL,connectionTimeoutMillis:2000});
const app=await buildApp(new Store(pool,settings.AUTH_SECRET),settings,true);
await app.listen({host:'127.0.0.1',port:settings.PORT});
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{void app.close().then(()=>pool.end()).then(()=>process.exit(0));});

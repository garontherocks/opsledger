import {writeFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {buildApp} from '../apps/api/src/app.ts';
import {Store} from '../apps/api/src/store.ts';
import {config} from '../apps/api/src/config.ts';
const settings=config({DATABASE_URL:'postgresql://localhost/opsledger_test',AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(),NODE_ENV:'test'});
const pool=new Pool({connectionString:settings.DATABASE_URL});
const app=await buildApp(new Store(pool,settings.AUTH_SECRET),settings);
try{await app.ready();await writeFile('docs/openapi.json',JSON.stringify(app.swagger(),null,2)+'\n');}finally{await app.close();await pool.end();}

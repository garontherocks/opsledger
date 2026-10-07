import {mkdir,lstat,realpath,chmod,open,link,unlink,readdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,join,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';
export const digest=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
export class PrivateStorage{
 root:string;
 constructor(root:string){if(!isAbsolute(root))throw new Error('Storage root must be absolute');this.root=resolve(root);}
 async init(){
  const publicRoot=resolve('apps/web/dist');if(this.root===publicRoot||this.root.startsWith(publicRoot+'/'))throw new Error('Storage cannot be inside the public web root');
  await mkdir(this.root,{recursive:true,mode:0o700});const stat=await lstat(this.root);
  if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Unsafe storage root');const actual=await realpath(this.root);let publicActual=publicRoot;try{publicActual=await realpath(publicRoot);}catch{/* The web build may not yet exist. */}
  if(actual===publicActual||actual.startsWith(publicActual+'/'))throw new Error('Storage cannot be inside the public web root');await chmod(this.root,0o700);
 }
 private path(id:string){return join(this.root,z.uuid().parse(id)+'.blob');}
 async read(id:string){
  const handle=await open(this.path(id),constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const stat=await handle.stat();if(!stat.isFile()||stat.size>262144)throw new Error('Unsafe stored object');return await handle.readFile();}finally{await handle.close();}
 }
 async put(id:string,bytes:Buffer,hash:string){
  if(!bytes.length||bytes.length>262144||digest(bytes)!==hash)throw new Error('Invalid stored object');
  const target=this.path(id);const temp=join(this.root,z.uuid().parse(id)+'.'+crypto.randomUUID()+'.tmp');
  const handle=await open(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}
  try{
   try{await link(temp,target);}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;if(digest(await this.read(id))!==hash)throw new Error('Stored object conflict');}
   const directory=await open(this.root,constants.O_RDONLY);try{await directory.sync();}finally{await directory.close();}
  }finally{await unlink(temp);}
 }
 async remove(id:string){try{await unlink(this.path(id));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  const directory=await open(this.root,constants.O_RDONLY);try{await directory.sync();}finally{await directory.close();}
 }
 async sweep(known:Set<string>,olderThan:Date){
  const removed:string[]=[];
  for(const name of await readdir(this.root)){
   if(!/^[a-f0-9-]{36}(?:\.[a-f0-9-]{36}\.tmp|\.blob)$/.test(name))continue;
   const path=join(this.root,name),stat=await lstat(path);if(stat.mtime>=olderThan)continue;
   if(name.endsWith('.blob')&&known.has(name.slice(0,36)))continue;
   await unlink(path);removed.push(name);
  }
  return {removed,retainedKnown:known.size};
 }
}

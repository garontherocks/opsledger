// JS process guard for reviewed M3 lab code; not an OS/native/child sandbox.
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import {syncBuiltinESMExports} from 'node:module';
const ports=new Set<number>();
export function allowLabPort(port:number){if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('lab_port');ports.add(port);}
export function disallowLabPort(port:number){ports.delete(port);}
function deny():never{throw new Error('OPSLEDGER_M3_EGRESS_DENIED');}
function check(host:unknown,port:unknown){if(host!=='127.0.0.1'||!ports.has(Number(port)))deny();}
const originalConnect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args:unknown[]){let first=args[0];if(Array.isArray(first))first=first[0];if(first&&typeof first==='object'){const options=first as {host?:string,hostname?:string,port?:number};check(options.host??options.hostname,options.port);}else check(args[1],first);return Reflect.apply(originalConnect,this,args);};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);if(url.protocol!=='http:'||url.username||url.password)deny();check(url.hostname,url.port||80);return originalFetch(input,{...init,redirect:'error'});};
for(const client of [http,https])for(const method of ['request','get'] as const){const original=client[method];Object.assign(client,{[method]:(input:unknown,...rest:unknown[])=>{if(typeof input==='string'||input instanceof URL){const url=new URL(input);if(url.protocol!=='http:')deny();check(url.hostname,url.port||80);}else {const options=input as {hostname?:string,host?:string,port?:number};check(options.hostname??options.host,options.port);}return Reflect.apply(original,client,[input,...rest]);}});}
const originalLookup=dns.lookup;
Object.assign(dns,{lookup:(host:string,...rest:unknown[])=>{if(host!=='127.0.0.1')deny();return Reflect.apply(originalLookup,dns,[host,...rest]);}});
syncBuiltinESMExports();

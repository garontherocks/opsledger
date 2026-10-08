// Controlled evaluation process guard, not a universal OS sandbox.
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import {syncBuiltinESMExports} from 'node:module';
const counts={allowed:0,denied:0,denials:[]};
globalThis.__opsledgerEgress=counts;
function deny(){counts.denied++;counts.denials.push(new Error().stack);throw new Error('OPSLEDGER_EVAL_EGRESS_DENIED');}
function check(host,port){if(host!=='127.0.0.1'||![11434,55446].includes(Number(port)))deny();counts.allowed++;}
const originalConnect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){let first=args[0];if(Array.isArray(first))first=first[0];if(first&&typeof first==='object')check(first.host??first.hostname,first.port);else check(typeof args[1]==='string'?args[1]:'localhost',first);return originalConnect.apply(this,args);};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);if(url.protocol!=='http:'||url.username||url.password)deny();check(url.hostname,url.port||80);return originalFetch(input,{...init,redirect:'error'});};
for(const client of [http,https])for(const method of ['request','get']){const original=client[method];client[method]=function(input,...rest){if(typeof input==='string'||input instanceof URL){const url=new URL(input);if(url.protocol!=='http:')deny();check(url.hostname,url.port||80);}else check(input.hostname??input.host,input.port??(client===https?443:80));return original.call(this,input,...rest);};}
const originalLookup=dns.lookup;
dns.lookup=function(host,...rest){if(host!=='127.0.0.1')deny();return originalLookup.call(this,host,...rest);};
syncBuiltinESMExports();

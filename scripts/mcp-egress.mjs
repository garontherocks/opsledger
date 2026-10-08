// Reviewed stdio-only JS process guard. Not an OS/native/child-process sandbox.
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import {syncBuiltinESMExports} from 'node:module';
const deny=()=>{throw new Error('OPSLEDGER_MCP_EGRESS_DENIED');};
globalThis.fetch=deny;
net.Socket.prototype.connect=deny;
for(const client of [http,https])for(const method of ['request','get'])client[method]=deny;
dns.lookup=deny;
syncBuiltinESMExports();

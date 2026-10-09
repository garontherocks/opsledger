import {randomUUID} from 'node:crypto';
import {QaWebhook,webhookSignature} from '../apps/api/src/qa-orchestration.ts';
const body=QaWebhook.parse({version:'qa-webhook-v1',eventId:randomUUID(),runId:process.env.QA_SERVICE_RUN_ID,workspaceId:process.env.QA_SERVICE_WORKSPACE_ID,sha:process.env.QA_TARGET_SHA,issuedAt:Date.now(),operation:process.argv[2],...(process.argv[3]?{approvalId:process.argv[3]}:{})});
if(!process.env.QA_WEBHOOK_SIGNING_KEY||!process.env.QA_N8N_INBOUND_TOKEN)throw new Error('Private operator signing key and n8n inbound token required');
const response=await fetch('http://127.0.0.1:5678/webhook/opsledger-qa-v1',{method:'POST',headers:{'content-type':'application/json','x-qa-inbound':process.env.QA_N8N_INBOUND_TOKEN,'x-qa-signature':webhookSignature(body,process.env.QA_WEBHOOK_SIGNING_KEY)},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
console.log(JSON.stringify({httpStatus:response.status,result:await response.json()}));if(!response.ok)process.exitCode=1;

import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {phase19Runner} from './phase19-runner.ts';
import {boundedQaPipeline,reviewPipelineArtifact} from '../apps/api/src/qa-pipeline.ts';
import {SPECIALIST_CASES,specialistCaseContext} from './phase18-cases.ts';
const sha=await phase19Runner.currentSha();assert.equal(sha,process.env.GITHUB_SHA,'Actual CI checkout SHA');
const context=specialistCaseContext(SPECIALIST_CASES[0]!,sha);
// Synthetic change scenario. Actual registered suites execute against this checkout.
const result=await boundedQaPipeline({sha,paths:['packages/contracts/src/lifecycle.ts','apps/api/src/qa-orchestration.ts']},context,phase19Runner,{generate:async()=>({text:JSON.stringify({status:'draft',risks:['revision-conflict','outbox-deadlock'],note:'Synthetic triage, not live semantic evidence.',operationalAuthority:false}),model:'fixture',digest:'sha256:'+'a'.repeat(64),runtime:'fixture',promptTokens:10,outputTokens:10,latencyMs:0,truncated:false})});
await mkdir('evidence',{recursive:true});await writeFile('evidence/phase19-pipeline.json',JSON.stringify({actualRegisteredExecution:true,syntheticChangeScenario:true,fixtureTriage:true,actualHumanReview:false,result},null,2)+'\n');
assert.equal(result.status,'awaiting_human_review',result.reason);assert.equal(result.additional.length,3);assert(result.additional.every(c=>c.passed));assert.equal(result.sha,sha);
const review=reviewPipelineArtifact(result,{sha,reportHash:result.reportHash,decision:'edit'},sha,context);assert.equal(review.releaseAuthority,false);console.log('Phase 19 actual registered execution and fixture artifact review passed; no live semantic/human acceptance.');

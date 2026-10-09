import {z} from 'zod';
import {hash} from './qa-agent.ts';
import {vectorValue,type EmbeddingProvider} from './embeddings.ts';

const Hex=z.string().regex(/^[a-f0-9]{64}$/);
const Sha=z.string().regex(/^[a-f0-9]{40}$/);
export const QaDocument=z.strictObject({id:z.string().regex(/^[a-z-]+$/),path:z.string().max(160),sha:Sha,text:z.string().min(1).max(16000),digest:Hex,topics:z.array(z.string().max(32)).max(5)});
export type QaDocument=z.infer<typeof QaDocument>;
export type QaScope={workspaceId:string,userId:string,sha:string};
export type QaSource={id:string,path:string,sha:string,digest:string,text:string,untrusted:true};
export type QaSnapshot={namespace:'qa-context-v1',space:string,sources:QaSource[],contextHash:string,operationalAuthority:false};
const Space=z.strictObject({model:z.string().min(1),digest:z.string().regex(/^sha256:[a-f0-9]{64}$/),dimensions:z.literal(768),chunkVersion:z.literal('qa-chunks-v1')});
// Caller supplies a reviewed corpus, never a model-selected path/URL. Product runbook
// indexes are deliberately inaccessible here. This experimental index is run-scoped.
export async function qaIndex(input:unknown,provider:EmbeddingProvider,scope:QaScope,authorized:()=>Promise<boolean>){
 const docs=z.array(QaDocument).min(1).max(8).parse(input);
 const space=JSON.stringify(Space.parse({model:provider.model,digest:provider.digest,dimensions:768,chunkVersion:'qa-chunks-v1'}));
 if(!await authorized())throw new Error('qa_context_denied');
 if(new Set(docs.map(d=>d.id)).size!==docs.length||docs.some(d=>d.sha!==scope.sha||hash(d.text)!==d.digest))throw new Error('qa_context_integrity');
 const chunks=docs.flatMap(d=>{const out:QaSource[]=[];for(let offset=0;offset<d.text.length;offset+=1000)out.push({id:d.id+'-'+offset,path:d.path,sha:d.sha,digest:d.digest,text:d.text.slice(offset,offset+1000),untrusted:true});return out;});
 const vectors:number[][]=[];
 for(let i=0;i<chunks.length;i+=4){const batch=chunks.slice(i,i+4);const v=await provider.embed(batch.map(c=>c.text),'document');if(v.length!==batch.length)throw new Error('qa_vector_count');vectors.push(...v.map(vectorValue));}
 if(!await authorized())throw new Error('qa_context_denied');
 return {space,async retrieve(query:string,current:QaScope,budget=3000):Promise<QaSnapshot>{
  z.string().min(1).max(1200).parse(query);z.number().int().min(1).max(4000).parse(budget);
  if(current.workspaceId!==scope.workspaceId||current.userId!==scope.userId||current.sha!==scope.sha||!await authorized())throw new Error('qa_context_stale');
  const expected=JSON.stringify(Space.parse({model:provider.model,digest:provider.digest,dimensions:768,chunkVersion:'qa-chunks-v1'}));if(expected!==space)throw new Error('qa_vector_space');
  const vs=await provider.embed([query],'query');if(vs.length!==1)throw new Error('qa_vector_count');const q=vectorValue(vs[0]);
  const ranked=chunks.map((c,i)=>({c,score:vectors[i]!.reduce((n,v,j)=>n+v*q[j]!,0)})).sort((a,b)=>b.score-a.score||a.c.id.localeCompare(b.c.id));
  let used=0;const sources:QaSource[]=[];
  for(const {c,score} of ranked){if(score<=0||sources.length===3)break;if(used+c.text.length>budget)continue;sources.push({...c});used+=c.text.length;}
  if(!await authorized()||current.sha!==scope.sha)throw new Error('qa_context_stale');
  return {namespace:'qa-context-v1',space,sources,contextHash:hash(JSON.stringify(sources)),operationalAuthority:false};
 }};
}

import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
test('lead moves incident through lifecycle; stale second tab must refresh',async({page,context},testInfo)=>{
 const actions:unknown[]=[];
 page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/actions')){const data=request.postDataJSON();actions.push({kind:'request',action:data.action,expectedRevision:data.expectedRevision,reason:data.reason??null});}});
 page.on('response',async response=>{if(response.request().method()==='POST'&&response.url().endsWith('/actions')){const data=await response.json().catch(()=>({}));actions.push({kind:'response',action:response.request().postDataJSON().action,status:response.status(),state:data.state??null,revision:data.revision??null,error:data.error?.code??data.error?.message??null});}});
 try{
 await page.goto('/');
 await page.getByLabel('Email',{exact:true}).fill('north-lead@example.test');
 await page.getByLabel('Password',{exact:true}).fill(process.env.E2E_PASSWORD!);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Report incident'})).toBeVisible();
 const title='Lifecycle '+crypto.randomUUID();
 await page.getByLabel('Title',{exact:true}).fill(title);
 await page.getByLabel('Description',{exact:true}).fill('Repeated worker timeouts need an operational response');
 await page.getByRole('button',{name:'Create incident',exact:true}).click();
 const detail=page.getByRole('article',{name:'Incident detail'});
 await expect(detail).toContainText(title);
 const stale=await context.newPage();await stale.goto('/');
 await stale.getByRole('button',{name:title,exact:true}).click();
 await page.getByLabel('Assignee',{exact:true}).selectOption('north-responder');
 await page.getByRole('button',{name:'Triage',exact:true}).click();
 await expect(detail.getByRole('button',{name:'Investigate',exact:true})).toBeVisible();
 await stale.getByLabel('Comment',{exact:true}).fill('A stale comment must not silently win');
 await stale.getByRole('button',{name:'Add comment',exact:true}).click();
 await expect(stale.getByRole('alert')).toContainText('Incident changed');
 await expect(stale.getByLabel('Comment',{exact:true})).toHaveValue('A stale comment must not silently win');
 await stale.getByRole('button',{name:'Refresh incident',exact:true}).click();
 await expect(stale.getByRole('button',{name:'Investigate',exact:true})).toBeVisible();await stale.close();
 await page.getByRole('button',{name:'Investigate',exact:true}).click();
 await page.getByLabel('Comment',{exact:true}).fill('Collected worker timeout evidence');
 await page.getByRole('button',{name:'Add comment',exact:true}).click();
 await expect(detail).toContainText('Collected worker timeout evidence');
 await page.getByLabel('Resolution summary',{exact:true}).fill('Restarted worker and confirmed stable processing');
 await page.getByRole('button',{name:'Resolve',exact:true}).click();
 await page.getByRole('button',{name:'Close incident',exact:true}).click();
 // Reopen is already rendered for resolved incidents. Wait for close to commit
 // before filling that form so a pending mutation cannot consume/reset its input.
 await expect(detail.locator('dl dd').first()).toHaveText('closed');
 await expect(detail.locator('dl dd').nth(2)).toHaveText('6');
 await page.getByLabel('Reopen reason',{exact:true}).fill('The timeout returned after the initial recovery');
 actions.push({kind:'before-reopen',form:await page.getByLabel('Reopen reason',{exact:true}).evaluate(element=>({value:(element as HTMLTextAreaElement).value,valid:(element as HTMLTextAreaElement).validity.valid,name:(element as HTMLTextAreaElement).name,formValid:(element as HTMLTextAreaElement).form?.checkValidity()}))});
 await page.getByRole('button',{name:'Reopen',exact:true}).click();
 await expect(page.getByLabel('Resolution summary',{exact:true})).toBeVisible();
 await expect(detail).toContainText('Revision 7');
 await page.reload();await page.getByRole('button',{name:title,exact:true}).click();
 await expect(page.getByRole('article',{name:'Incident detail'})).toContainText('The timeout returned');
 await page.screenshot({path:'evidence/phase4-lifecycle.png',fullPage:true});
 }finally{
  actions.push({kind:'final-ui',detail:await page.getByRole('article',{name:'Incident detail'}).innerText().catch(()=>null),alerts:await page.getByRole('alert').allTextContents()});
  console.log('LIFECYCLE_DIAGNOSTIC '+JSON.stringify({syntheticOnly:true,actions}));
  await mkdir('evidence',{recursive:true});await writeFile('evidence/m3-lifecycle-diagnostic-'+testInfo.repeatEachIndex+'.json',JSON.stringify({syntheticOnly:true,actions},null,2)+'\n');
 }
});


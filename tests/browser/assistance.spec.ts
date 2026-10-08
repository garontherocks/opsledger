import {test,expect} from '@playwright/test';
import {AxeBuilder} from '@axe-core/playwright';
import {writeFile} from 'node:fs/promises';
test('local draft UI preserves evidence, escapes model text and recovers from outage (provider fixture)',async({page})=>{
 await page.request.post('/api/auth/sign-in/email',{data:{email:'north-reporter@example.test',password:process.env.E2E_PASSWORD}});await page.goto('/');
 await page.getByLabel('Title',{exact:true}).fill('Synthetic local assistance UI');await page.getByLabel('Description',{exact:true}).fill('Synthetic incident to exercise read-only local draft UI');await page.getByRole('button',{name:'Create incident',exact:true}).click();
 const region=page.getByRole('region',{name:'AI timeline draft'});await expect(region).toBeVisible();
 await page.route('**/incidents/*/summary',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'Service unavailable',requestId:'synthetic-model-outage'}})}));
 await region.getByRole('button',{name:'Draft timeline summary',exact:true}).click();await expect(region.getByRole('alert')).toContainText('synthetic-model-outage');await expect(page.getByRole('article',{name:'Incident detail'})).toContainText('reported');
 await page.unroute('**/incidents/*/summary');await region.getByRole('button',{name:'Draft timeline summary',exact:true}).click();await expect(region).toContainText('Fixture-only <script>');expect(await page.evaluate(()=>('aiExecuted' in window))).toBe(false);await expect(region).toContainText('Human review required.');await expect(page.getByRole('article',{name:'Incident detail'})).toContainText('reported');
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(result.violations).toEqual([]);await writeFile('evidence/phase6-draft-accessibility.json',JSON.stringify({provider:'deterministic fixture, not live model',violations:result.violations,fullConformanceClaim:false},null,2));
 await page.screenshot({path:'evidence/phase6-draft-ui.png',fullPage:true});
 await page.getByLabel('Comment',{exact:true}).fill('New evidence invalidates the previous draft.');await page.getByRole('button',{name:'Add comment',exact:true}).click();await expect(region).not.toContainText('Fixture-only');
});

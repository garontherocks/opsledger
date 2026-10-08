import {test,expect} from '@playwright/test';
import {AxeBuilder} from '@axe-core/playwright';
import {writeFile,copyFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
test('v1 accessibility, mobile, recoverable failure, visual stability and demo',async({browser,page})=>{
 test.setTimeout(120000);

 const evidence:{screen:string,violations:unknown[]}[]=[];
 async function check(screen:string){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();evidence.push({screen,violations:result.violations});expect(result.violations,screen).toEqual([]);}
 await page.goto('/');await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();await check('login');
 await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#content')).toBeFocused();
 await expect(page).toHaveScreenshot('login-desktop.png',{animations:'disabled'});
 const login=await page.request.post('/api/auth/sign-in/email',{data:{email:'north-reporter@example.test',password:process.env.E2E_PASSWORD}});expect(login.status()).toBe(200);
 await page.reload();await expect(page.getByRole('heading',{name:'Report incident'})).toBeVisible();await check('incident-empty');
 await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'evidence/phase5-mobile.png',fullPage:true});await check('mobile');
 await page.setViewportSize({width:1280,height:900});
 await page.getByLabel('Title',{exact:true}).fill('Deterministic recovery demo');await page.getByLabel('Description',{exact:true}).fill('Synthetic incident for the conventional v1 baseline');
 await page.route('**/api/v1/workspaces/*/incidents',route=>route.request().method()==='POST'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'Service unavailable',requestId:'controlled-outage'}})}):route.continue());
 await page.getByRole('button',{name:'Create incident',exact:true}).click();await expect(page.getByRole('alert')).toContainText('controlled-outage');await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Deterministic recovery demo');
 await page.unroute('**/api/v1/workspaces/*/incidents');await page.getByRole('button',{name:'Create incident',exact:true}).click();await expect(page.getByRole('article',{name:'Incident detail'})).toBeVisible();await check('incident-detail');
 await page.getByRole('button',{name:'Open files',exact:true}).click();await expect(page.getByRole('heading',{name:'Incident files',exact:true})).toBeVisible();await check('files');
 await page.getByRole('button',{name:'Open knowledge',exact:true}).click();await expect(page.getByRole('heading',{name:'Runbooks',exact:true})).toBeVisible();await check('knowledge');
 await page.getByRole('button',{name:'Open notifications',exact:true}).click();await expect(page.getByRole('heading',{name:'Notifications',exact:true})).toBeVisible();await check('notifications');
 await writeFile('evidence/phase5-accessibility.json',JSON.stringify({automatedOnly:true,tags:['wcag2a','wcag2aa','wcag21a','wcag21aa'],screens:evidence,manualChecks:['keyboard skip link focus','320px no horizontal overflow','form preserved after controlled HTTP 503']},null,2));
 const context=await browser.newContext({baseURL:'http://localhost:3100',storageState:await page.context().storageState(),recordVideo:{dir:'.local/phase5-video',size:{width:1280,height:720}},viewport:{width:1280,height:720}});
 const demo=await context.newPage();await demo.goto('/');await expect(demo.getByRole('heading',{name:'Report incident'})).toBeVisible();
 // Brief presentation holds make the recorded demo readable; assertions still synchronize work.
 await demo.waitForTimeout(1000);
 await demo.getByRole('button',{name:'Deterministic recovery demo',exact:true}).click();await expect(demo.getByRole('article',{name:'Incident detail'})).toBeVisible();await demo.getByLabel('Comment',{exact:true}).fill('Synthetic evidence: the conventional workflow is available without AI.');await demo.getByRole('button',{name:'Add comment',exact:true}).click();await expect(demo.getByText('Revision 2 · comment',{exact:false})).toBeVisible();await demo.screenshot({path:'evidence/phase5-v1-detail.png',fullPage:true});await demo.waitForTimeout(1500);
 await demo.getByRole('button',{name:'Open files',exact:true}).click();await demo.getByRole('button',{name:'Request incident export',exact:true}).click();
 await expect(async()=>{await demo.getByRole('button',{name:'Refresh files',exact:true}).click();await expect(demo.getByRole('link',{name:/Download/})).toBeVisible();}).toPass({timeout:15000,intervals:[500,1000]});await demo.waitForTimeout(1500);
 await demo.getByRole('button',{name:'Open knowledge',exact:true}).click();await expect(demo.getByRole('heading',{name:'Runbooks',exact:true})).toBeVisible();await demo.getByRole('button',{name:/ · v1$/}).first().click();await expect(demo.getByRole('article',{name:'Runbook version'})).toBeVisible();await demo.waitForTimeout(1500);await demo.getByRole('button',{name:'Open notifications',exact:true}).click();await expect(demo.getByRole('heading',{name:'Notifications',exact:true})).toBeVisible();await demo.waitForTimeout(1500);await demo.getByRole('button',{name:'Refresh notifications',exact:true}).click();await demo.getByRole('button',{name:'Open related incident',exact:true}).first().click();await expect(demo.getByRole('article',{name:'Incident detail'})).toBeVisible();await demo.waitForTimeout(1000);
 const video=demo.video()!;await context.close();await mkdir('evidence',{recursive:true});await copyFile(await video.path(),'evidence/phase5-v1-demo.webm');
 const screenshot=await page.screenshot();await writeFile('evidence/phase5-browser-runtime.json',JSON.stringify({driver:'Playwright 1.64.0',browser:browser.version(),viewport:page.viewportSize(),selectedVisualBaseline:'login-desktop.png',demo:'phase5-v1-demo.webm',finalScreenshotSha256:createHash('sha256').update(screenshot).digest('hex'),ai:false},null,2));
});

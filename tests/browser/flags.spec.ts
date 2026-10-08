import {test,expect} from '@playwright/test';
test('server capabilities disable writes and optional UI while preserving reads and sign out',async({page})=>{
 await page.request.post('/api/auth/sign-in/email',{data:{email:'north-reporter@example.test',password:process.env.E2E_PASSWORD}});
 await page.goto('/');await expect(page.getByText('Maintenance mode:',{exact:false})).toBeVisible();
 await expect(page.getByLabel('Title',{exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Create incident',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Open knowledge',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Open notifications',exact:true})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Incidents',exact:true})).toBeVisible();await page.screenshot({path:'evidence/phase5-maintenance.png',fullPage:true});
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
});

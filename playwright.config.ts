import{defineConfig}from'@playwright/test';
const password=process.env.E2E_PASSWORD??crypto.randomUUID()+'-Pass9!';
process.env.E2E_PASSWORD=password;
export default defineConfig({
  testDir:'tests/browser',fullyParallel:false,workers:1,retries:0,
  use:{baseURL:'http://localhost:3100',trace:'retain-on-failure',screenshot:'only-on-failure',
    ...(process.env.PW_CHROMIUM_EXECUTABLE?{launchOptions:{executablePath:process.env.PW_CHROMIUM_EXECUTABLE}}:{})},
  reporter:[['list'],['html',{open:'never'}]],
  webServer:{command:'node --experimental-strip-types scripts/e2e-server.ts',url:'http://localhost:3100/health/ready',reuseExistingServer:false,timeout:60000,env:{E2E_PASSWORD:password}},
});

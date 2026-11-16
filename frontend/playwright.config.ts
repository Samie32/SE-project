import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir:"./tests/e2e", testMatch:"**/*.spec.ts", workers:1, timeout:90000,
  expect:{timeout:15000}, reporter:[["list"],["html",{open:"never"}]],
  use:{
    baseURL:"http://127.0.0.1:5174", headless:true, permissions:["camera","microphone"],actionTimeout:15000,
    trace:"retain-on-failure", screenshot:"only-on-failure",
    launchOptions:{channel:process.env.RTC_BROWSER_CHANNEL || undefined,args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream","--autoplay-policy=no-user-gesture-required"]},
  },
  webServer:{command:"npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",url:"http://127.0.0.1:5174",reuseExistingServer:!process.env.CI,timeout:60000},
});

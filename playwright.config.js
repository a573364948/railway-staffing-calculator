const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // 全局测试配置
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // 全局配置
    actionTimeout: 0,
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'Microsoft Edge',
      use: { 
        browserName: 'chromium',
        channel: 'msedge',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      },
    },
    // 可选：保留其他浏览器作为备选
    // {
    //   name: 'chromium',
    //   use: { ...require('@playwright/test').devices['Desktop Chrome'] },
    // },
    // {
    //   name: 'firefox',
    //   use: { ...require('@playwright/test').devices['Desktop Firefox'] },
    // },
  ],

  // 本地开发服务器配置
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
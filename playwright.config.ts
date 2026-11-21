import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    channel: 'chrome',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    {
      name: 'Desktop Web (Google Material Workspace)',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 }
      }
    },
    {
      name: 'Mobile Android (Pixel 7 / Material You)',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 393, height: 852 },
        isMobile: true,
        hasTouch: true
      }
    }
  ],
  webServer: {
    command: 'python3 scripts/serve-spa.py',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 30000
  }
});

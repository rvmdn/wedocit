import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    [path.resolve(__dirname, 'src/reporters/wedocit-word-reporter.ts')]
  ],
  use: {
    headless: true,
    viewport: { width: 1366, height: 768 },
    actionTimeout: 10000,
    trace: 'off',
    video: 'off'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});

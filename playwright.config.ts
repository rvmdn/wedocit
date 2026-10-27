import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Baca file .env jika ada (tanpa butuh external dependency)
const envFile = path.resolve(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

const authFile = path.resolve(__dirname, '.auth/user.json');
const hasAuth = fs.existsSync(authFile);

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
    baseURL: process.env.FAST_BASE_URL || 'https://amsfast-dev.bni.co.id:8081',
    ignoreHTTPSErrors: true,
    headless: true,
    viewport: { width: 1366, height: 768 },
    actionTimeout: 20000,
    storageState: hasAuth ? authFile : undefined,
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

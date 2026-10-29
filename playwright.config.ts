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

// Deteksi file auth sesi (mendukung user_default.json atau user.json)
const authDefaultFile = path.resolve(__dirname, '.auth/user_default.json');
const authLegacyFile = path.resolve(__dirname, '.auth/user.json');
const authFile = fs.existsSync(authDefaultFile) ? authDefaultFile : (fs.existsSync(authLegacyFile) ? authLegacyFile : undefined);

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    [path.resolve(__dirname, 'src/reporters/wedocit-word-reporter.ts')]
  ],
  use: {
    baseURL: process.env.APP_BASE_URL || process.env.FAST_BASE_URL || 'https://amsfast-dev.bni.co.id:8081',
    ignoreHTTPSErrors: true,
    headless: true,
    viewport: { width: 1366, height: 768 },
    actionTimeout: 20000,
    storageState: authFile,
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

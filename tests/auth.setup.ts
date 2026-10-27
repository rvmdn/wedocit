import { test as setup } from '@playwright/test';
import { ensureAuthenticated } from '../src/helpers/auth';

setup('Autentikasi Akun & Multi-Role WeDocIt', async ({ page }) => {
  // Menyiapkan sesi awal untuk role DEFAULT / ANGGOTA
  await ensureAuthenticated(page, { role: 'DEFAULT' });
});

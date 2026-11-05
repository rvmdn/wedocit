import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ensureOrmsAuthenticated, OrmsAuthOptions } from './orms-auth';

const rmisAuthFile = path.resolve(process.cwd(), '.auth/user_rmis_admin.json');
const ormsAuthFile = path.resolve(process.cwd(), '.auth/user_orms_admin.json');

export { OrmsAuthOptions as RmisAuthOptions };

/**
 * Helper autentikasi untuk Risk Management Information System (RMIS)
 */
export async function ensureRmisAuthenticated(page: Page, options: OrmsAuthOptions = {}) {
  const username = options.username || process.env.RMIS_USERNAME || process.env.ORMS_USERNAME || 'Admin';
  const password = options.password || process.env.RMIS_PASSWORD || process.env.ORMS_PASSWORD || 'AdminBni1234/';
  return ensureOrmsAuthenticated(page, { ...options, username, password });
}


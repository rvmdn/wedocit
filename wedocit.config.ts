import * as path from 'path';
import { WeDocItMetadata } from './src/fixtures/wedocit';

export interface DocumentConfig {
  templatePath?: string;
  outputDir?: string;
  filenamePattern?: string; // e.g. 'EDV_Unit_Test_{crNo}_{module}_V1.0.docx'
}

export interface AppRoleConfig {
  usernameEnv: string;
  passwordEnv: string;
  loginTypeEnv?: string;
  defaultUsername?: string;
  defaultPassword?: string;
  defaultType?: string;
}

export interface AppAuthConfig {
  baseUrl: string;
  loginPath: string;
  selectors: {
    usernameInput: string;
    passwordInput: string;
    typeSelect?: string;
    submitButton: string;
    toastMessage?: string;
  };
  roles: Record<string, AppRoleConfig>;
  autoResetSession?: {
    enabled: boolean;
    detectKeyword: string;
    resetPasswordEnv?: string;
    defaultResetPassword?: string;
  };
}

export interface WeDocItConfiguration {
  document: DocumentConfig;
  app: AppAuthConfig;
  metadata: WeDocItMetadata;
}

/**
 * Konfigurasi Generik WeDocIt v2.0
 * Jika digunakan untuk aplikasi lain, cukup sesuaikan parameter di bawah ini atau melalui file .env
 */
export const wedocitConfig: WeDocItConfiguration = {
  // 1. Konfigurasi Template Dokumen & Folder Output
  document: {
    templatePath: process.env.DOC_TEMPLATE_PATH || path.resolve(process.cwd(), 'templates', 'template-bni-edv.docx'),
    outputDir: process.env.DOC_OUTPUT_DIR || path.resolve(process.cwd(), 'output'),
    filenamePattern: process.env.DOC_FILENAME_PATTERN || 'EDV_Unit_Test_{crNo}_{module}_V1.0.docx'
  },

  // 2. Konfigurasi Aplikasi & Autentikasi (Bisa disesuaikan untuk aplikasi web apa pun)
  app: {
    baseUrl: process.env.APP_BASE_URL || process.env.FAST_BASE_URL || 'https://amsfast-dev.bni.co.id:8081',
    loginPath: process.env.APP_LOGIN_PATH || process.env.FAST_LOGIN_PATH || '/login',
    selectors: {
      usernameInput: process.env.SEL_USERNAME || 'input#username',
      passwordInput: process.env.SEL_PASSWORD || 'input[type="password"]',
      typeSelect: process.env.SEL_TYPE || 'p-select, .p-select',
      submitButton: process.env.SEL_SUBMIT || 'button[type="submit"]',
      toastMessage: process.env.SEL_TOAST || '.p-toast-message, .p-toast-detail, .p-toast-summary'
    },
    // Definisi Multi-Role (Anggota, Katim, PKA, Admin, dll.)
    roles: {
      DEFAULT: {
        usernameEnv: 'FAST_USERNAME',
        passwordEnv: 'FAST_PASSWORD',
        loginTypeEnv: 'FAST_LOGIN_TYPE',
        defaultUsername: '900097',
        defaultPassword: 'bni1234/',
        defaultType: 'HQ'
      },
      ANGGOTA: {
        usernameEnv: 'FAST_USER_ANGGOTA',
        passwordEnv: 'FAST_PASS_ANGGOTA',
        loginTypeEnv: 'FAST_LOGIN_TYPE',
        defaultUsername: '900097',
        defaultPassword: 'bni1234/',
        defaultType: 'HQ'
      },
      KATIM: {
        usernameEnv: 'FAST_USER_KATIM',
        passwordEnv: 'FAST_PASS_KATIM',
        loginTypeEnv: 'FAST_LOGIN_TYPE',
        defaultUsername: '900097',
        defaultPassword: 'bni1234/',
        defaultType: 'HQ'
      },
      PKA: {
        usernameEnv: 'FAST_USER_PKA',
        passwordEnv: 'FAST_PASS_PKA',
        loginTypeEnv: 'FAST_LOGIN_TYPE',
        defaultUsername: '900097',
        defaultPassword: 'bni1234/',
        defaultType: 'HQ'
      }
    },
    // Mekanisme pemulihan sesi aktif bentrok (Single-Session Enforcement)
    autoResetSession: {
      enabled: true,
      detectKeyword: process.env.SESSION_RESET_KEYWORD || 'already login',
      resetPasswordEnv: 'FAST_RESET_PASSWORD',
      defaultResetPassword: 'ResetBni'
    }
  },

  // 3. Metadata Resmi Dokumen BNI EDV (Cover, Header, Tabel 2.1, Bab 3)
  metadata: {
    systemName: process.env.DOC_SYSTEM_NAME || 'AMS Fast',
    projectName: process.env.DOC_PROJECT_NAME || 'AMS (Audit Management System)',
    crNo: process.env.DOC_CR_NO || 'CR_AMS_2026_OFFLINE',
    title: process.env.DOC_TITLE || 'Unit Test Documentation - Pelaksanaan Audit (Offline & Online)',
    module: process.env.DOC_MODULE || 'Pelaksanaan Audit',
    shortDescription: process.env.DOC_SHORT_DESC || 'Modul Pelaksanaan Audit mencakup AP Non-Kredit, Pengujian AP, AP Kredit, RHA, dan Pelaksanaan Audit Online.',
    scope: process.env.DOC_SCOPE || 'Pengujian menyeluruh modul Pelaksanaan Audit Offline (AP Non-Kredit, Pengujian AP, AP Kredit, RHA) dan Pelaksanaan Audit Online',
    acceptanceCriteria: process.env.DOC_CRITERIA || 'Seluruh skenario pengujian (Rich Text Jodit Editor, Notifikasi, Validasi Upload Lampiran, dan Hak Akses Role) berjalan sukses dan data tersimpan di sistem.',
    testedBy: process.env.DOC_TESTED_BY || 'Irvan Ramadan',
    npp: process.env.DOC_NPP || '822117',
    developers: [
      {
        name: process.env.DOC_TESTED_BY || 'Irvan Ramadan',
        npp: process.env.DOC_NPP || '822117'
      }
    ],
    startDate: process.env.DOC_START_DATE || '19/08/2026',
    endDate: process.env.DOC_END_DATE || '27/10/2026',
    docDate: process.env.DOC_DATE || '27/10/2026',
    copyrightYear: process.env.DOC_YEAR || '2026'
  }
};


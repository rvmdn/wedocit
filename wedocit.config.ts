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
 * Konfigurasi Generik WeDocIt v3.0
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
        usernameEnv: 'APP_USERNAME',
        passwordEnv: 'APP_PASSWORD',
        loginTypeEnv: 'APP_LOGIN_TYPE',
        defaultUsername: process.env.FAST_USERNAME || process.env.APP_USERNAME || 'admin',
        defaultPassword: process.env.FAST_PASSWORD || process.env.APP_PASSWORD || '',
        defaultType: process.env.FAST_LOGIN_TYPE || ''
      },
      ANGGOTA: {
        usernameEnv: 'FAST_USER_ANGGOTA',
        passwordEnv: 'FAST_PASS_ANGGOTA',
        loginTypeEnv: 'FAST_LOGIN_TYPE',
        defaultUsername: process.env.FAST_USER_ANGGOTA || process.env.FAST_USERNAME || '900097',
        defaultPassword: process.env.FAST_PASS_ANGGOTA || process.env.FAST_PASSWORD || 'bni1234/',
        defaultType: process.env.FAST_LOGIN_TYPE || 'HQ'
      },
      KATIM: {
        usernameEnv: 'FAST_USER_KATIM',
        passwordEnv: 'FAST_PASS_KATIM',
        loginTypeEnv: 'FAST_LOGIN_TYPE',
        defaultUsername: process.env.FAST_USER_KATIM || '900097',
        defaultPassword: process.env.FAST_PASS_KATIM || 'bni1234/',
        defaultType: process.env.FAST_LOGIN_TYPE || 'HQ'
      },
      PKA: {
        usernameEnv: 'FAST_USER_PKA',
        passwordEnv: 'FAST_PASS_PKA',
        loginTypeEnv: 'FAST_LOGIN_TYPE',
        defaultUsername: process.env.FAST_USER_PKA || '900097',
        defaultPassword: process.env.FAST_PASS_PKA || 'bni1234/',
        defaultType: process.env.FAST_LOGIN_TYPE || 'HQ'
      }
    },
    // Mekanisme pemulihan sesi aktif bentrok (Single-Session Enforcement)
    autoResetSession: {
      enabled: Boolean(process.env.SESSION_RESET_ENABLED !== 'false'),
      detectKeyword: process.env.SESSION_RESET_KEYWORD || 'already login',
      resetPasswordEnv: 'FAST_RESET_PASSWORD',
      defaultResetPassword: process.env.FAST_RESET_PASSWORD || 'ResetBni'
    }
  },

  // 3. Metadata Resmi Dokumen BNI EDV (Cover, Header, Tabel 2.1, Bab 3)
  metadata: {
    companyName: process.env.DOC_COMPANY || 'PT Bank Negara Indonesia (Persero) Tbk',
    systemName: process.env.DOC_SYSTEM_NAME || 'AMS Fast',
    projectName: process.env.DOC_PROJECT_NAME || 'AMS (Audit Management System)',
    crNo: process.env.DOC_CR_NO || 'CR_UNIT_TEST',
    title: process.env.DOC_TITLE || 'Unit Test Documentation',
    module: process.env.DOC_MODULE || 'Modul Aplikasi',
    shortDescription: process.env.DOC_SHORT_DESC || 'Pengujian dan verifikasi modul aplikasi.',
    scope: process.env.DOC_SCOPE || 'Verifikasi alur proses pengujian fitur terkait.',
    acceptanceCriteria: process.env.DOC_CRITERIA || 'Seluruh skenario pengujian berhasil dieksekusi sesuai spesifikasi.',
    testedBy: process.env.DOC_TESTED_BY || 'QA Engineer',
    npp: process.env.DOC_NPP || '-',
    developers: [
      {
        name: process.env.DOC_TESTED_BY || 'QA Engineer',
        npp: process.env.DOC_NPP || '-'
      }
    ],
    startDate: process.env.DOC_START_DATE || new Date().toLocaleDateString('id-ID'),
    endDate: process.env.DOC_END_DATE || new Date().toLocaleDateString('id-ID'),
    docDate: process.env.DOC_DATE || new Date().toLocaleDateString('id-ID'),
    copyrightYear: process.env.DOC_YEAR || String(new Date().getFullYear())
  }
};


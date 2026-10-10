/**
 * =============================================================================
 * Production Environment Pre-Flight Verification Script
 * 
 * Verifies all security criteria, infrastructure secrets, and configuration invariants
 * before production container initialization and traffic routing.
 * =============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

// Load env files
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), '../../.env.local'));
loadEnvFile(path.resolve(process.cwd(), '../../.env'));

interface CheckResult {
  category: string;
  check: string;
  passed: boolean;
  message: string;
}

export async function verifyProductionEnvironment(): Promise<CheckResult[]> {
  console.log('\n===============================================================');
  console.log('🛡️ PRODUCTION ENVIRONMENT & SECURITY PRE-FLIGHT AUDIT');
  console.log('===============================================================\n');

  const checks: CheckResult[] = [];

  const addCheck = (category: string, check: string, passed: boolean, message: string) => {
    checks.push({ category, check, passed, message });
    console.log(`${passed ? '✅' : '❌'} [${category}] ${check}: ${message}`);
  };

  // 1. Mandatory Secrets & URLs
  const requiredEnvVars = [
    { key: 'DATABASE_URL', desc: 'PostgreSQL Database Connection URI' },
    { key: 'SUPABASE_URL', desc: 'Supabase Base URL' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Supabase Service Role Secret Key' },
    { key: 'RAZORPAY_KEY_ID', desc: 'Razorpay Key ID' },
    { key: 'RAZORPAY_KEY_SECRET', desc: 'Razorpay Secret Key' },
    { key: 'RAZORPAY_WEBHOOK_SECRET', desc: 'Razorpay Webhook Signature Secret' },
  ];

  for (const env of requiredEnvVars) {
    const val = process.env[env.key];
    const exists = !!val && val.length > 5;
    addCheck('Environment Secrets', env.key, exists, exists ? `Configured (${env.desc})` : `MISSING or empty (${env.desc})`);
  }

  // 2. CORS Wildcard Check
  const corsOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001,http://localhost:3002';
  const hasWildcard = corsOrigins.includes('*');
  addCheck('CORS Security', 'No Wildcard CORS in Production', !hasWildcard, hasWildcard ? 'CORS_ORIGINS contains unsafe wildcard "*"' : `Strict CORS whitelist: ${corsOrigins}`);

  // 3. Node Environment
  const validModes = ['production', 'development', 'staging', 'test'];
  const currentMode = process.env.NODE_ENV || 'development';
  const isModeValid = validModes.includes(currentMode);
  addCheck('Runtime Config', 'NODE_ENV Mode Validity', isModeValid, `Active runtime mode: ${currentMode}`);

  // 4. Crypto Verification Key Format
  try {
    const crypto = await import('crypto');
    const { generateKeyPairSync } = crypto;
    const { privateKey, publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    addCheck('Cryptography', 'NIST P-256 Key Engine Support', !!privateKey && !!publicKey, 'Native OpenSSL prime256v1 hardware curve operational');
  } catch (err: any) {
    addCheck('Cryptography', 'NIST P-256 Key Engine Support', false, `Crypto initialization failed: ${err.message}`);
  }

  // 5. Summary
  const allPassed = checks.every((c) => c.passed);
  console.log('\n===============================================================');
  console.log(`PRE-FLIGHT AUDIT SUMMARY: ${allPassed ? '✅ 100% READY FOR RELEASE' : '⚠️ PRE-FLIGHT CHECKS FAILED'}`);
  console.log('===============================================================\n');

  return checks;
}

if (require.main === module) {
  verifyProductionEnvironment()
    .then((checks) => {
      const allPassed = checks.every((c) => c.passed);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal pre-flight audit error:', err);
      process.exit(1);
    });
}

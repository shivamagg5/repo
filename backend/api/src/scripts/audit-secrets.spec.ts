import * as fs from 'fs';
import * as path from 'path';

describe('Security Build Audit — Prohibited Secret Leak Audit Suite', () => {
  const prohibitedPatterns = [
    /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?ey[A-Za-z0-9_-]{20,}/i,
    /DATABASE_URL\s*=\s*['"]?postgres(ql)?:\/\/[^'"]+/i,
    /REDIS_URL\s*=\s*['"]?redis:\/\/[^'"]+/i,
    /RAZORPAY_WEBHOOK_SECRET\s*=\s*['"]?[A-Za-z0-9_-]{10,}/i,
    /RAZORPAY_KEY_SECRET\s*=\s*['"]?[A-Za-z0-9_-]{10,}/i,
    /-----BEGIN (EC|RSA|OPENSSH) PRIVATE KEY-----/,
  ];

  function scanDirectory(dirPath: string, extensions: string[]): string[] {
    const violations: string[] = [];
    if (!fs.existsSync(dirPath)) return violations;

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory() && !item.name.includes('node_modules') && !item.name.includes('.git')) {
        violations.push(...scanDirectory(fullPath, extensions));
      } else if (item.isFile() && extensions.some((ext) => item.name.endsWith(ext))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of prohibitedPatterns) {
          if (pattern.test(content)) {
            violations.push(`Secret leak matching pattern ${pattern} found in file: ${fullPath}`);
          }
        }
      }
    }
    return violations;
  }

  it('BACKEND SECRET AUDIT: Verifies backend source code does not contain hardcoded private secrets', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    const violations = scanDirectory(srcDir, ['.ts', '.js']);
    expect(violations).toEqual([]);
  });

  it('FLUTTER SECRET AUDIT: Verifies Flutter mobile source code does not contain hardcoded private secrets', () => {
    const mobileDir = path.resolve(__dirname, '../../../../apps/scanner-mobile/lib');
    const violations = scanDirectory(mobileDir, ['.dart']);
    expect(violations).toEqual([]);
  });
});

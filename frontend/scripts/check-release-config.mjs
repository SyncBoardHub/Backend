import { existsSync, readFileSync } from 'node:fs';

const loadEnv = (file) => {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
    const separator = line.indexOf('=');
    return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')];
  }));
};

const values = {
  ...loadEnv('.env'),
  ...loadEnv('.env.production'),
  ...process.env,
};
const required = ['VITE_PUBLIC_APP_URL', 'VITE_LEGAL_ENTITY_NAME', 'VITE_LEGAL_CONTACT_EMAIL', 'VITE_LEGAL_BUSINESS_ADDRESS', 'VITE_LEGAL_POLICY_VERSION'];
const placeholderPattern = /yourdomain|example|your registered|replace|localhost/i;
const errors = [];

for (const key of required) {
  if (!values[key] || placeholderPattern.test(values[key])) errors.push(`${key} must contain production-specific information`);
}
if (!String(values.VITE_PUBLIC_APP_URL || '').startsWith('https://')) errors.push('VITE_PUBLIC_APP_URL must use HTTPS');
if (!existsSync('public/favicon.svg')) errors.push('public/favicon.svg is required');

if (errors.length) {
  console.error('Release configuration is incomplete:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Release configuration is ready for deployment checks.');

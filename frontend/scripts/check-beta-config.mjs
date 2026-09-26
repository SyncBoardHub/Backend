import { existsSync, readFileSync } from 'node:fs';

const envFiles = ['.env', '.env.local', '.env.beta'];
const values = {};
for (const file of envFiles) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const separator = line.indexOf('=');
    if (separator > 0 && !line.trimStart().startsWith('#')) values[line.slice(0, separator)] = line.slice(separator + 1).trim();
  }
}
Object.assign(values, process.env);

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_API_URL'];
const missing = required.filter((key) => !values[key] || values[key].includes('your-'));
if (!existsSync('public/favicon.svg')) missing.push('public/favicon.svg');
if (missing.length) {
  console.error(`Beta configuration is incomplete: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`Beta configuration is ready (${values.VITE_APP_ENV || 'beta'}).`);

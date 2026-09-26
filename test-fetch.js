const fs = require('fs');

const envPath = `${__dirname}/frontend/.env`;
const env = fs.readFileSync(envPath, 'utf8');
for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const fetch = globalThis.fetch;

if (!fetch) {
  throw new Error('This smoke test requires Node.js 18 or newer.');
}

async function testFetch() {
  try {
    console.log('Testing Supabase Auth API...');
    const url = `${process.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`;
    console.log(`URL: ${url}`);
    const res1 = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'fake@example.com', password: 'fake' })
    });
    console.log(`Supabase Status: ${res1.status}`);
    const data1 = await res1.json().catch(() => null);
    console.log(`Supabase Resp:`, data1);
  } catch (err) {
    console.error('Supabase ERROR:', err.message);
  }

  try {
    console.log('\nTesting Localhost Node API...');
    const url = `${process.env.VITE_API_URL}/api/auth/me`;
    console.log(`URL: ${url}`);
    const res2 = await fetch(url);
    console.log(`Localhost Status: ${res2.status}`);
    const data2 = await res2.json().catch(() => null);
    console.log(`Localhost Resp:`, data2);
  } catch (err) {
    console.error('Localhost ERROR:', err.message);
  }
}

testFetch();

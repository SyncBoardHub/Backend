const EMAIL_API_URL = 'https://api.resend.com/emails';
const MAX_DAILY_EMAILS = 100;
let dailyUsage = { day: '', count: 0 };

function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.RESEND_FROM_EMAIL || ''
  };
}

function isEmailConfigured() {
  const { apiKey, from } = getEmailConfig();
  return Boolean(apiKey && from);
}

async function sendEmail({ to, subject, text, html }) {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey || !from || !to) return { sent: false, reason: 'email_not_configured' };
  if (typeof to !== 'string' || typeof subject !== 'string' || typeof text !== 'string' || typeof html !== 'string' || to.length > 320 || subject.length > 180 || text.length > 4000 || html.length > 12000) {
    return { sent: false, reason: 'email_payload_rejected' };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (dailyUsage.day !== today) dailyUsage = { day: today, count: 0 };
  if (dailyUsage.count >= MAX_DAILY_EMAILS) return { sent: false, reason: 'email_daily_limit' };
  dailyUsage.count += 1;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
      signal: controller.signal
    });

    if (!response.ok) {
      dailyUsage.count -= 1;
      return { sent: false, reason: 'email_provider_rejected' };
    }
    return { sent: true };
  } catch (error) {
    dailyUsage.count -= 1;
    return { sent: false, reason: error.name === 'AbortError' ? 'email_timeout' : 'email_provider_unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { isEmailConfigured, sendEmail };

'use strict';

/**
 * Input sanitizer: strips angle brackets and trims whitespace.
 * Used to prevent stored XSS in text fields stored in the DB.
 */
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
}

/**
 * HTML-escape for email templates.
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

module.exports = { sanitize, escapeHtml };

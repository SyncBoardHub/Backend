'use strict';

const dns = require('dns');
const net = require('net');

/**
 * SSRF protection utility.
 * Used before any server-side HTTP fetch to an external URL to ensure
 * it is not targeting internal or private network resources.
 */

function isPrivateAddress(address) {
  if (net.isIP(address) === 4) {
    const octets = address.split('.').map(Number);
    return (
      octets[0] === 0 ||
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );
  }
  const n = address.toLowerCase();
  return (
    n === '::1' ||
    n.startsWith('fc') ||
    n.startsWith('fd') ||
    n.startsWith('fe80:')
  );
}

async function validateExternalUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Invalid URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Only public HTTP(S) URLs are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    throw new Error('Private network URLs are not allowed');
  }

  const addresses = net.isIP(hostname)
    ? [hostname]
    : (await dns.promises.lookup(hostname, { all: true })).map(({ address }) => address);

  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new Error('Private network URLs are not allowed');
  }

  return parsed.toString();
}

module.exports = { validateExternalUrl, isPrivateAddress };

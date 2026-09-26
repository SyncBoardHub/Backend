export function buildInviteLink(code) {
  const configuredBase = import.meta.env.VITE_PUBLIC_APP_URL;
  let base = window.location.origin;
  if (configuredBase) {
    try {
      base = new URL(configuredBase, base).origin;
    } catch {
      base = window.location.origin;
    }
  }
  return new URL(`/join/${encodeURIComponent(code)}`, base).toString();
}

export function buildInviteMessage(teamName, link) {
  return `Join ${teamName} on SyncBoard: ${link}`;
}

export function buildShareTargets(teamName, link) {
  const message = buildInviteMessage(teamName, link);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    email: `mailto:?subject=${encodeURIComponent(`Join ${teamName} on SyncBoard`)}&body=${encodeURIComponent(message)}`,
    sms: `sms:?&body=${encodeURIComponent(message)}`
  };
}

export const EMAIL_MAX_LENGTH = 254;

export function parseEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length > EMAIL_MAX_LENGTH || /\s/.test(email)) return null;

  const atIndex = email.indexOf('@');
  if (atIndex < 1 || atIndex !== email.lastIndexOf('@')) return null;

  const labels = email.slice(atIndex + 1).split('.');
  const hasValidDomain = labels.length >= 2 && labels.every((label) => label.length > 0);
  return hasValidDomain ? email : null;
}

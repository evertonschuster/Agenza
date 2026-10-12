export const PHONE_MAX_LENGTH = 20;

export function parsePhone(raw: string): string | null {
  const phone = raw.trim();
  const hasValidShape =
    phone.length <= PHONE_MAX_LENGTH && /\d/.test(phone) && /^[\d +()-]+$/.test(phone);

  return hasValidShape ? phone : null;
}

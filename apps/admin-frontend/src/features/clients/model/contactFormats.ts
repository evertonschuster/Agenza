export const PHONE_MAX_LENGTH = 20;
export const EMAIL_MAX_LENGTH = 254;

export function isValidPhone(value: string): boolean {
  return value.length <= PHONE_MAX_LENGTH && /\d/.test(value) && /^[\d +()-]+$/.test(value);
}

export function isValidEmail(value: string): boolean {
  if (value.length > EMAIL_MAX_LENGTH || /\s/.test(value)) return false;

  const parts = value.split('@');
  if (parts.length !== 2) return false;

  const [local = '', domain = ''] = parts;
  const labels = domain.split('.');
  return local.length > 0 && labels.length >= 2 && labels.every((label) => label.length > 0);
}

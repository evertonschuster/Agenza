const CPF_LENGTH = 11;

export function parseCpf(raw: string): string | null {
  const digits = raw.replace(/[.\-\s]/g, '');
  if (digits.length !== CPF_LENGTH || !/^\d+$/.test(digits) || new Set(digits).size === 1) {
    return null;
  }

  const hasValidCheckDigits =
    checkDigit(digits, 9) === Number(digits.charAt(9)) &&
    checkDigit(digits, 10) === Number(digits.charAt(10));
  return hasValidCheckDigits ? digits : null;
}

export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, CPF_LENGTH);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function checkDigit(digits: string, digitCount: number): number {
  let sum = 0;
  for (let index = 0; index < digitCount; index += 1) {
    sum += Number(digits.charAt(index)) * (digitCount + 1 - index);
  }

  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

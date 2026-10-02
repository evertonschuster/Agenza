const CPF_LENGTH = 11;

export function stripCpfMask(value: string): string {
  return value.replace(/[.\-\s]/g, '');
}

export function isValidCpf(value: string): boolean {
  const digits = stripCpfMask(value);
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;

  return (
    checkDigit(digits, 9) === Number(digits.charAt(9)) &&
    checkDigit(digits, 10) === Number(digits.charAt(10))
  );
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, CPF_LENGTH);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function checkDigit(digits: string, length: number): number {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += Number(digits.charAt(index)) * (length + 1 - index);
  }

  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

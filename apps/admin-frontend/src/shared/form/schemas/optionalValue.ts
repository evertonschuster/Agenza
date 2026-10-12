import { z } from 'zod';

type Fail = (message: string) => never;

export function optionalValue<T>(parse: (raw: string, fail: Fail) => T) {
  return z.string().transform((raw, ctx): T | null => {
    if (raw.trim() === '') return null;

    return parse(raw, (message) => {
      ctx.addIssue({ code: 'custom', message });
      return z.NEVER;
    });
  });
}

import { cn } from '@/shared/lib/utils';
import type { ProblemCodeProps } from './problem-code.types';

function ProblemCode({ code, className }: ProblemCodeProps) {
  if (!code) return null;

  return <p className={cn('text-xs text-muted-foreground', className)}>Código: {code}</p>;
}

export { ProblemCode };
export type { ProblemCodeProps };

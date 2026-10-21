import { useEffect, useState } from 'react';

type Cooldown = readonly [remainingSeconds: number, start: (seconds: number) => void];

export function useCooldown(): Cooldown {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = setTimeout(() => setRemainingSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [remainingSeconds]);

  return [remainingSeconds, setRemainingSeconds];
}

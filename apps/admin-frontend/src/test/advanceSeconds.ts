import { act } from '@testing-library/react';
import { vi } from 'vitest';

export async function advanceSeconds(seconds: number): Promise<void> {
  await act(() => Promise.resolve());
  for (let elapsed = 0; elapsed < seconds; elapsed += 1) {
    await act(() => {
      vi.advanceTimersByTime(1000);
      return Promise.resolve();
    });
  }
}

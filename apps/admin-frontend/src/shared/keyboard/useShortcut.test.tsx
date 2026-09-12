import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { shortcutRegistry } from './shortcuts';
import { useShortcut } from './useShortcut';

function fireKey(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function TestComponent({ onFire }: { onFire: () => void }) {
  useShortcut('test-shortcut', 'x', 'Test shortcut', onFire);
  return null;
}

describe('useShortcut', () => {
  afterEach(() => {
    shortcutRegistry.reset();
  });

  it('registers on mount and unregisters on unmount', () => {
    const onFire = vi.fn();
    const { unmount } = render(<TestComponent onFire={onFire} />);

    fireKey('x');
    expect(onFire).toHaveBeenCalledTimes(1);

    unmount();
    fireKey('x');
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('always calls the latest handler without re-registering', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<TestComponent onFire={first} />);
    rerender(<TestComponent onFire={second} />);

    fireKey('x');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

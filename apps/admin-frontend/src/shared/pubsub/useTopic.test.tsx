import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { createTopic, type Topic } from './createTopic';
import { useTopic } from './useTopic';

function TestComponent({
  topic,
  onFire,
}: {
  topic: Topic<string>;
  onFire: (payload: string) => void;
}) {
  useTopic(topic, onFire);
  return null;
}

describe('useTopic', () => {
  it('subscribes on mount and calls the listener when the topic publishes', () => {
    const topic = createTopic<string>();
    const onFire = vi.fn();
    render(<TestComponent topic={topic} onFire={onFire} />);

    topic.publish('hello');

    expect(onFire).toHaveBeenCalledWith('hello');
  });

  it('unsubscribes on unmount', () => {
    const topic = createTopic<string>();
    const onFire = vi.fn();
    const { unmount } = render(<TestComponent topic={topic} onFire={onFire} />);

    unmount();
    topic.publish('after unmount');

    expect(onFire).not.toHaveBeenCalled();
  });

  it('calls the latest listener after a rerender with a new closure', () => {
    const topic = createTopic<string>();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<TestComponent topic={topic} onFire={first} />);

    rerender(<TestComponent topic={topic} onFire={second} />);
    topic.publish('after rerender');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('after rerender');
  });

  it('does not resubscribe on every rerender, only on mount', () => {
    const topic = createTopic<string>();
    const subscribeSpy = vi.spyOn(topic, 'subscribe');
    const { rerender } = render(<TestComponent topic={topic} onFire={vi.fn()} />);

    rerender(<TestComponent topic={topic} onFire={vi.fn()} />);
    rerender(<TestComponent topic={topic} onFire={vi.fn()} />);

    expect(subscribeSpy).toHaveBeenCalledTimes(1);
  });
});

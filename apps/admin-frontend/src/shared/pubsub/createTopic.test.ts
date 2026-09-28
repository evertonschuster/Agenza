import { describe, expect, it, vi } from 'vitest';
import { createTopic } from './createTopic';

describe('createTopic', () => {
  describe('publish', () => {
    it('calls every subscribed listener with the published payload', () => {
      const topic = createTopic<{ id: string }>();
      const first = vi.fn();
      const second = vi.fn();
      topic.subscribe(first);
      topic.subscribe(second);

      topic.publish({ id: '1' });

      expect(first).toHaveBeenCalledTimes(1);
      expect(first).toHaveBeenCalledWith({ id: '1' });
      expect(second).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledWith({ id: '1' });
    });

    it('does not call a listener before anything has been published', () => {
      const topic = createTopic<number>();
      const listener = vi.fn();
      topic.subscribe(listener);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('returns an unsubscribe that stops further notifications', () => {
      const topic = createTopic<number>();
      const listener = vi.fn();
      const unsubscribe = topic.subscribe(listener);

      topic.publish(1);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      topic.publish(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('independent topics', () => {
    it("never cross-talk — publishing on one topic never notifies another topic's listeners", () => {
      const topicA = createTopic<string>();
      const topicB = createTopic<string>();
      const listenerA = vi.fn();
      const listenerB = vi.fn();
      topicA.subscribe(listenerA);
      topicB.subscribe(listenerB);

      topicA.publish('from A');

      expect(listenerA).toHaveBeenCalledWith('from A');
      expect(listenerB).not.toHaveBeenCalled();
    });
  });
});

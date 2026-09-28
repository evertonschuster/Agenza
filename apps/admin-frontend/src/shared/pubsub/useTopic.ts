import { useEffect, useRef } from 'react';
import type { Topic } from './createTopic';

export function useTopic<T>(topic: Topic<T>, listener: (payload: T) => void): void {
  const listenerRef = useRef(listener);
  useEffect(() => {
    listenerRef.current = listener;
  });

  useEffect(() => {
    return topic.subscribe((payload) => listenerRef.current(payload));
  }, [topic]);
}

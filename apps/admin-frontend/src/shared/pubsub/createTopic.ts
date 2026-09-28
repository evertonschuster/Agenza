export interface Topic<T> {
  publish: (payload: T) => void;
  subscribe: (listener: (payload: T) => void) => () => void;
}

export function createTopic<T>(): Topic<T> {
  const listeners = new Set<(payload: T) => void>();

  return {
    publish(payload) {
      listeners.forEach((listener) => listener(payload));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

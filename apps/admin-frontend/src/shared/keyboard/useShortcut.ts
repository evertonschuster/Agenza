import { useEffect, useRef } from 'react';
import { shortcutRegistry, type Shortcut } from './shortcuts';

export function useShortcut(
  id: string,
  key: string,
  description: string,
  handler: () => void,
  options?: { modified?: boolean },
): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  const modified = options?.modified;

  useEffect(() => {
    const shortcut: Shortcut = {
      id,
      key,
      description,
      modified,
      handler: () => handlerRef.current(),
    };
    return shortcutRegistry.register(shortcut);
  }, [id, key, description, modified]);
}

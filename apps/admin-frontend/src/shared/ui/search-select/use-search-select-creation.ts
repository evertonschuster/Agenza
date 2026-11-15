import { useState } from 'react';
import { flushSync } from 'react-dom';
import type {
  SearchSelectCreationRequest,
  SearchSelectItem,
  UseSearchSelectCreationArgs,
} from './search-select.types';

export function useSearchSelectCreation<T extends SearchSelectItem>(
  args: UseSearchSelectCreationArgs<T>,
) {
  const { creation, value, onValueChange, blocked, closePicker, anchor } = args;
  const [typed, setTyped] = useState('');
  const [requestedText, setRequestedText] = useState<string | null>(null);
  const text = typed.trim();

  function searchInput() {
    return anchor.current?.querySelector('input') ?? null;
  }

  function end() {
    flushSync(() => setRequestedText(null));
    searchInput()?.focus();
  }

  function start() {
    if (blocked) return;
    closePicker();
    setRequestedText(text);
  }

  const request: SearchSelectCreationRequest<T> | null =
    requestedText === null
      ? null
      : {
          text: requestedText,
          finalFocus: searchInput,
          complete(created) {
            onValueChange([...value, created]);
            end();
          },
          cancel: end,
        };

  const label = text ? creation?.actionLabelFor(text) : creation?.actionLabel;

  return { request, label: label ?? '', start, setTyped };
}

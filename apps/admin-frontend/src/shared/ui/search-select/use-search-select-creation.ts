import { useEffect, useRef, useState } from 'react';
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
  const pressedText = useRef<string | null>(null);
  const valueRef = useRef(value);
  const text = typed.trim();

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  function searchInput() {
    return anchor.current?.querySelector('input') ?? null;
  }

  function end() {
    flushSync(() => setRequestedText(null));
    searchInput()?.focus();
  }

  // Pressing the field button moves focus off the input, which closes the list and clears the text
  // before the click arrives; the press keeps what was typed.
  function remember() {
    pressedText.current = text;
  }

  function forget() {
    pressedText.current = null;
  }

  function start() {
    if (blocked) return;
    const chosen = pressedText.current ?? text;
    pressedText.current = null;
    closePicker();
    setRequestedText(chosen);
  }

  const request: SearchSelectCreationRequest<T> | null =
    requestedText === null
      ? null
      : {
          text: requestedText,
          finalFocus: searchInput,
          complete(created) {
            onValueChange([...valueRef.current, created]);
            end();
          },
          cancel: end,
        };

  const label = text ? creation?.actionLabelFor(text) : creation?.actionLabel;

  return { request, label: label ?? '', start, remember, forget, setTyped };
}

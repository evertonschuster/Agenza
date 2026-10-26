import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useMatch, useResolvedPath, useSearchParams } from 'react-router';

type SearchParamValue = string | number | boolean;

type SearchParamsRecord<T> = Record<keyof T, SearchParamValue>;

function readBoolean(raw: string, fallback: boolean): boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

function readValue<V extends SearchParamValue>(raw: string | null, fallback: V): V {
  if (raw === null || raw === '') return fallback;
  if (typeof fallback === 'string') return raw as V;
  if (typeof fallback === 'boolean') return readBoolean(raw, fallback) as V;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? (parsed as V) : fallback;
}

function readParams<T extends SearchParamsRecord<T>>(params: URLSearchParams, defaults: T): T {
  const value = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    value[key] = readValue(params.get(key), defaults[key]);
  }
  return value;
}

export function useSearchParamsState<T extends SearchParamsRecord<T>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [value, setValue] = useState(() => readParams(searchParams, defaults));
  const hasChanged = useRef(false);
  const isCurrentRoute = useMatch(useResolvedPath('.').pathname) !== null;

  const writeParams = useEffectEvent((next: T) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        for (const key of Object.keys(defaults) as (keyof T & string)[]) {
          if (next[key] === defaults[key]) params.delete(key);
          else params.set(key, String(next[key]));
        }
        return params;
      },
      { replace: true },
    );
  });

  useEffect(() => {
    // A dialog can close through history after a fast page correction; write on the owning route.
    if (hasChanged.current && isCurrentRoute) writeParams(value);
  }, [value, isCurrentRoute]);

  function update(next: T) {
    hasChanged.current = true;
    setValue(next);
  }

  return [value, update] as const;
}

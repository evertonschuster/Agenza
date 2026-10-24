import { useState } from 'react';
import { useSearchParams } from 'react-router';

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

  function update(next: T) {
    setValue(next);
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
  }

  return [value, update] as const;
}

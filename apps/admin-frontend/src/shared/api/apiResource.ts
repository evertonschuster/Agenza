import { useCallback, useEffect, useRef, useState } from 'react';
import { fail } from '@/shared/result';
import type { ApiProblem, ApiResult } from './servicesFacade';

export const NETWORK_PROBLEM: ApiProblem = {
  status: 0,
  code: 'Network.Unreachable',
  title: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
};

export async function settle<T>(call: Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  try {
    return await call;
  } catch {
    return fail(NETWORK_PROBLEM);
  }
}

interface ApiResource<T> {
  data: T | null;
  problem: ApiProblem | null;
  loading: boolean;
  reload: () => void;
}

export function useApiResource<T>(
  fetcher: (signal: AbortSignal) => Promise<ApiResult<T>>,
): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    void settle(fetcherRef.current(controller.signal)).then((result) => {
      if (ignore) return;
      setLoading(false);
      if (result.ok) {
        setData(result.data);
        setProblem(null);
      } else {
        setProblem(result.error);
      }
    });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return { data, problem, loading, reload };
}

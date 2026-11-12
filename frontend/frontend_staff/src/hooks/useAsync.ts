import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/api/client";

export interface AsyncState<T> {
  data: T | undefined;
  error: string;
  status: number | undefined;
  loading: boolean;
  reload: () => void;
}

/** Runs `fn` on mount / when `deps` change; ignores stale responses. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [status, setStatus] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const run = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const id = ++run.current;
    setLoading(true);
    setError("");
    setStatus(undefined);
    fnRef
      .current()
      .then((d) => {
        if (id === run.current) setData(d);
      })
      .catch((e: unknown) => {
        if (id !== run.current) return;
        setError(errorMessage(e));
        setStatus((e as { status?: number }).status);
      })
      .finally(() => {
        if (id === run.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, status, loading, reload };
}

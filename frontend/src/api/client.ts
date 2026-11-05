// ─── API client – thin wrapper around fetch ──────────────────────────────────

const TOKEN_KEY = 'access_token';

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  idempotencyKey?: string
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
  };

  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
  });

  if (!res.ok) {
    let errorDetail: any = null;
    try {
      errorDetail = await res.json();
    } catch {
      errorDetail = { detail: await res.text().catch(() => '') };
    }
    const err: Error & { status?: number; detail?: string; title?: string } = new Error(
      errorDetail?.detail || errorDetail?.title || `HTTP ${res.status}`
    );
    err.status = res.status;
    err.detail = errorDetail?.detail || errorDetail?.title;
    err.title = errorDetail?.title;
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    apiFetch<T>(
      path,
      { method: 'POST', body: body ? JSON.stringify(body) : undefined },
      idempotencyKey
    ),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
};

export function formatMMK(amount: number, lang: 'en' | 'my' = 'en'): string {
  const num = new Intl.NumberFormat('en-US').format(Math.round(amount));
  return lang === 'my' ? `${num} ကျပ်` : `${num} MMK`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TOKEN_KEY = 'bookhaven_token';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed') as Error & {
      status?: number;
      data?: Record<string, unknown>;
    };
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

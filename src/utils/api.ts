const TOKEN_KEYS = {
  access: 'accessToken',
  refresh: 'refreshToken',
  user: 'user',
} as const;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);
  if (!refreshToken) return null;

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    localStorage.setItem(TOKEN_KEYS.access, data.accessToken);
    localStorage.setItem(TOKEN_KEYS.refresh, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function api(path: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = localStorage.getItem(TOKEN_KEYS.access);

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  let res = await fetch(path, { ...options, headers });

  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(path, { ...options, headers });
    } else {
      localStorage.removeItem(TOKEN_KEYS.access);
      localStorage.removeItem(TOKEN_KEYS.refresh);
      localStorage.removeItem(TOKEN_KEYS.user);
      window.location.href = '/login';
    }
  }

  return res;
}

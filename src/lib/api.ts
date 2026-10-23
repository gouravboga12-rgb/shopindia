/**
 * Minimal fetch wrapper — attaches JWT, handles JSON, throws on error.
 */

const RAW_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const BASE = RAW_BASE.replace(/\/api\/?$/, '').replace(/\/$/, '');

function getToken(path: string): string | null {
  if (path.startsWith('/api/vendor')) {
    return localStorage.getItem('shopindia_vendor_token');
  }
  if (path.startsWith('/api/admin')) {
    return localStorage.getItem('shopindia_admin_token');
  }
  if (path.startsWith('/api/regional-admin')) {
    return localStorage.getItem('shopindia_regional_admin_token') || localStorage.getItem('shopindia_admin_token');
  }
  if (path.startsWith('/api/rider')) {
    return localStorage.getItem('shopindia_rider_token');
  }
  return localStorage.getItem('shopindia_customer_token') || localStorage.getItem('shopindia_admin_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken(path);
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    // If the token is invalid/expired, auto-logout
    if (res.status === 401 && !path.includes('/login')) {
      localStorage.removeItem('shopindia_customer_token');
      localStorage.removeItem('shopindia_customer_user');
      localStorage.removeItem('shopindia_admin_token');
      localStorage.removeItem('shopindia_admin_user');
      localStorage.removeItem('shopindia_vendor_token');
      localStorage.removeItem('shopindia_vendor_user');
      window.location.reload();
      return Promise.reject(new Error('Session expired'));
    }
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',  body: body instanceof FormData ? body : JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT',   body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

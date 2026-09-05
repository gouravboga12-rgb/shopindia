export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const TOKEN_KEY = 'shopindia_customer_token';
const USER_KEY = 'shopindia_customer_user';

const RAW_API = import.meta.env.VITE_API_URL || 'http://localhost:5001';
export const API_BASE = RAW_API.replace(/\/api\/?$/, '').replace(/\/$/, '');

export const getCustomerToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const getCustomerUser = (): CustomerUser | null => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const setCustomerSession = (token: string, user: CustomerUser) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearCustomerSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export async function registerCustomer(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/customer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function loginCustomer(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/customer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function fetchCustomerOrders(email?: string) {
  const token = getCustomerToken();
  if (!token) throw new Error('Not authenticated');
  const q = email ? `?email=${encodeURIComponent(email)}` : '';
  const res = await fetch(`${API_BASE}/api/orders${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.orders || [];
}

export async function requestPasswordReset(email: string) {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function verifyPasswordResetOtp(email: string, otp: string) {
  const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}


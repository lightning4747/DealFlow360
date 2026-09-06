export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('df360_access_token') || localStorage.getItem('token');
}

export function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

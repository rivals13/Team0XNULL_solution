import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

export const BASE_URL = 'http://localhost:3000/api/v1';

const client = axios.create({ baseURL: BASE_URL, timeout: 15_000 });

// ── Attach JWT to every request ────────────────────────────────────────────
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Unwrap { success, data, timestamp } envelope from backend ─────────────
// Every backend response is wrapped by ResponseInterceptor.
// We unwrap it here so all API calls receive the real payload directly.
client.interceptors.response.use((response) => {
  if (
    response.data &&
    typeof response.data === 'object' &&
    'success' in response.data &&
    'data' in response.data
  ) {
    response.data = response.data.data;
  }
  return response;
});

// ── Auto-refresh on 401 ────────────────────────────────────────────────────
// Skip refresh logic for auth endpoints — a 401 there means wrong credentials,
// NOT an expired token. Triggering logout() on those would reload the page
// before the error message could be shown.
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

let refreshing = false;
let queue: Array<(t: string) => void> = [];

client.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = original?.url ?? '';

    // Never attempt token refresh for auth endpoints
    const isAuthEndpoint = AUTH_PATHS.some(p => url.includes(p));
    if (isAuthEndpoint) return Promise.reject(error);

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const rt = localStorage.getItem('refreshToken');
      if (!rt) { logout(); return Promise.reject(error); }

      if (refreshing) {
        return new Promise((resolve) => {
          queue.push((newToken) => {
            original.headers['Authorization'] = `Bearer ${newToken}`;
            resolve(client(original));
          });
        });
      }
      refreshing = true;
      try {
        const { data: raw } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: rt });
        const unwrapped = raw?.data ?? raw;
        const { accessToken, refreshToken } = unwrapped;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        queue.forEach((cb) => cb(accessToken));
        queue = [];
        original.headers['Authorization'] = `Bearer ${accessToken}`;
        return client(original);
      } catch {
        logout();
        return Promise.reject(error);
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export default client;

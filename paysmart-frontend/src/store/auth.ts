import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

// Hydrate from localStorage
const storedUser = localStorage.getItem('user');

export const useAuthStore = create<AuthState>((set) => ({
  user:         storedUser ? JSON.parse(storedUser) : null,
  accessToken:  localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('user',         JSON.stringify(user));
    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken, refreshToken });
  },

  clearAuth: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));

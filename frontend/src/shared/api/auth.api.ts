import { api } from './client';
import type { Account, AuthResult, DashboardSummary, User } from './types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  passwordConfirmation?: string;
  phone?: string | null;
  companyName?: string | null;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<AuthResult>('/auth/register', payload, { auth: false }),

  login: (email: string, password: string) =>
    api.post<AuthResult>('/auth/login', { email, password }, { auth: false }),

  me: () => api.get<Account>('/auth/me'),

  logout: (refreshToken?: string) => api.post<{ revokedSessions: number }>('/auth/logout', { refreshToken }),

  forgotPassword: (email: string) =>
    api.post<{ devToken?: string }>('/auth/forgot-password', { email }, { auth: false }),

  deleteAccount: (email: string, password: string) =>
    api.post<null>('/auth/delete-account', { email, password }, { auth: false }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<null>('/auth/reset-password', { token, newPassword }, { auth: false }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<null>('/auth/change-password', { currentPassword, newPassword }),

  onboarding: (sellsType: string, mainGoal: string) =>
    api.post<{ user: User }>('/auth/onboarding', { sellsType, mainGoal }),
};

export const dashboardApi = {
  summary: (month?: string) =>
    api.get<DashboardSummary>(`/dashboard${month ? `?month=${month}` : ''}`),
};

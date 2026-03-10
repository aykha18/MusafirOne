import api from './api';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  requestOtp: async (phoneNumber: string) => {
    const response = await api.post('/auth/request-otp', { phoneNumber });
    return response.data;
  },

  verifyOtp: async (phoneNumber: string, otp: string) => {
    const response = await api.post<LoginResponse>('/auth/verify-otp', {
      phoneNumber,
      otp,
      isLogin: true,
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  },
};

import api from './api';

export interface User {
  id: string;
  phoneNumber: string;
  fullName: string;
  city: string;
  corridor: string;
  verificationLevel: number;
  trustScore: number;
  isSuspended: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export interface PaginatedUsers {
  items: User[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export const usersService = {
  listAll: async (page = 1, limit = 20) => {
    const response = await api.get<PaginatedUsers>('/users', {
      params: { page, limit },
    });
    return response.data;
  },

  suspendUser: async (userId: string, isSuspended: boolean) => {
    const response = await api.patch(`/users/${userId}/suspend`, { isSuspended });
    return response.data;
  },

  verifyUser: async (userId: string, level: number) => {
    const response = await api.patch(`/users/${userId}/verify`, { level });
    return response.data;
  },
};

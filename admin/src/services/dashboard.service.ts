import api from './api';

export interface DashboardStats {
  totalUsers: number;
  activeDisputes: number;
  totalParcels: number;
  totalCurrencyPosts: number;
}

export const dashboardService = {
  getStats: async () => {
    const response = await api.get<DashboardStats>('/admin/dashboard/stats');
    return response.data;
  },
};

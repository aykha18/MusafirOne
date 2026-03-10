import api from './api';

export interface Log {
  id: string;
  entityType: string;
  entityId: string;
  fromState: string | null;
  toState: string;
  changedByUserId: string | null;
  changedByUser?: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
  reason: string | null;
  metadata: any;
  createdAt: string;
}

export interface PaginatedLogs {
  items: Log[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export const logsService = {
  listLogs: async (page = 1, limit = 20, filters?: { entityType?: string; entityId?: string; userId?: string }) => {
    const response = await api.get<PaginatedLogs>('/admin/logs', {
      params: { page, limit, ...filters },
    });
    return response.data;
  },
};

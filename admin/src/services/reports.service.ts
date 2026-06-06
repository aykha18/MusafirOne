import api from './api';

export type ReportStatus = 'open' | 'resolved';

export type AdminReport = {
  id: string;
  businessId: string;
  reporterUserId: string;
  status: ReportStatus;
  reason: string;
  details?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedByAdminId?: string | null;
  business: {
    id: string;
    name: string;
    type: 'exchange' | 'umrah';
    status: 'pending' | 'active' | 'rejected';
    claimStatus: 'unclaimed' | 'claim_requested' | 'claimed' | 'claim_rejected';
    isVerified: boolean;
    ownerUserId?: string | null;
  };
  reporter: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
  resolvedByAdmin?: {
    id: string;
    fullName: string;
    phoneNumber: string;
  } | null;
};

export const reportsService = {
  list: async (status?: ReportStatus) => {
    const response = await api.get<AdminReport[]>('/admin/reports', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },
  resolve: async (id: string) => {
    const response = await api.patch(`/admin/reports/${id}/resolve`, {});
    return response.data;
  },
};


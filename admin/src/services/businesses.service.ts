import api from './api';

export type BusinessType = 'exchange' | 'umrah';
export type BusinessStatus = 'pending' | 'active' | 'rejected';
export type BusinessClaimStatus =
  | 'unclaimed'
  | 'claim_requested'
  | 'claimed'
  | 'claim_rejected';

export type AdminBusiness = {
  id: string;
  ownerUserId?: string | null;
  type: BusinessType;
  name: string;
  status: BusinessStatus;
  claimStatus: BusinessClaimStatus;
  isVerified: boolean;
  createdAt: string;
};

export const businessesService = {
  list: async (params?: { status?: string; type?: string }) => {
    const response = await api.get<AdminBusiness[]>('/admin/businesses', {
      params,
    });
    return response.data;
  },
  reject: async (businessId: string) => {
    const response = await api.post(`/admin/businesses/${businessId}/reject`, {});
    return response.data;
  },
  merge: async (targetBusinessId: string, sourceBusinessId: string) => {
    const response = await api.post(`/admin/businesses/${targetBusinessId}/merge`, {
      sourceBusinessId,
    });
    return response.data;
  },
  generateClaimCode: async (businessId: string) => {
    const response = await api.post<{ ok: true; code: string }>(
      `/admin/businesses/${businessId}/claim-code`,
      {},
    );
    return response.data;
  },
};

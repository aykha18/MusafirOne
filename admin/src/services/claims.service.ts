import api from './api';

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export type AdminClaim = {
  id: string;
  businessId: string;
  requesterUserId: string;
  status: ClaimStatus;
  method: 'phone_otp' | 'docs' | 'in_person_code';
  phoneToVerify?: string | null;
  docsJson?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedByAdminId?: string | null;
  business: {
    id: string;
    name: string;
    type: 'exchange' | 'umrah';
    status: 'pending' | 'active' | 'rejected';
    claimStatus: 'unclaimed' | 'claim_requested' | 'claimed' | 'claim_rejected';
    isVerified: boolean;
    ownerUserId?: string | null;
  };
  requester: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
  reviewedByAdmin?: {
    id: string;
    fullName: string;
    phoneNumber: string;
  } | null;
};

export const claimsService = {
  list: async (status?: ClaimStatus) => {
    const response = await api.get<AdminClaim[]>('/admin/claims', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },
  approve: async (id: string) => {
    const response = await api.patch(`/admin/claims/${id}/approve`, {});
    return response.data;
  },
  reject: async (id: string, rejectionReason?: string) => {
    const response = await api.patch(`/admin/claims/${id}/reject`, { rejectionReason });
    return response.data;
  },
};

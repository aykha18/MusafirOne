import api from './api';

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED_VALID = 'RESOLVED_VALID',
  RESOLVED_INVALID = 'RESOLVED_INVALID',
  DISMISSED = 'DISMISSED',
}

export interface Dispute {
  id: string;
  raisedByUserId: string;
  raisedAgainstUserId: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  raisedBy: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
  raisedAgainst: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
}

export const disputesService = {
  listAll: async () => {
    const response = await api.get<Dispute[]>('/disputes');
    return response.data;
  },

  resolveDispute: async (id: string, status: DisputeStatus, resolutionNotes: string) => {
    const response = await api.post(`/disputes/${id}/resolve`, {
      status,
      resolutionNotes,
    });
    return response.data;
  },
};

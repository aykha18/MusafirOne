import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';

export type User = {
  id: string;
  phoneNumber: string;
  fullName?: string;
  city?: string;
  corridor?: string;
  verificationLevel?: number;
  trustScore?: number;
  createdAt?: string;
  isAdmin?: boolean;
  isSuspended?: boolean;
};

export type MyStats = {
  exchanges: number;
  parcels: number;
  ratingAvg: number | null;
  ratingCount: number;
  community: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type RequestOtpPayload = {
  phoneNumber: string;
};

export type VerifyOtpPayload = {
  phoneNumber: string;
  code: string;
  deviceFingerprint: string;
};

export type LinkPhonePayload = {
  phoneNumber: string;
  code: string;
  deviceFingerprint?: string;
};

export type RefreshTokenPayload = {
  refreshToken: string;
};

export type UpdateProfilePayload = {
  fullName?: string;
  city?: string;
  corridor?: string;
};

export type DisputeStatus = 'open' | 'under_review' | 'resolved_valid' | 'resolved_invalid';

export type Dispute = {
  id: string;
  matchRequestId?: string | null;
  parcelRequestId?: string | null;
  raisedByUserId: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedByAdminId?: string | null;
  matchRequest?: unknown;
  parcelRequest?: unknown;
};

export type VerificationDocumentType =
  | 'id_card'
  | 'passport'
  | 'driver_license'
  | 'residence_permit'
  | 'selfie';

export type VerificationDocumentStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type VerificationDocument = {
  id: string;
  userId: string;
  type: VerificationDocumentType;
  status: VerificationDocumentStatus;
  fileName: string;
  mimeType: string;
  storagePath: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  reviewedByAdminId?: string | null;
  rejectionReason?: string | null;
  user?: User;
  reviewedByAdmin?: User | null;
};

export type FeatureIdea = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  voteCount: number;
  voted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCurrencyPostPayload = {
  haveCurrency: string;
  needCurrency: string;
  amount: number;
  preferredRate: number;
  city: string;
  expiryDate: string;
};

export type UpdateCurrencyPostPayload = Partial<CreateCurrencyPostPayload>;

export type CreateMatchRequestPayload = {
  message?: string;
};

export type CreateParcelTripPayload = {
  fromCountry: string;
  toCountry: string;
  departureDate: string;
  arrivalDate: string;
  maxWeightKg: number;
  allowedCategories: string;
};

export type UpdateParcelTripPayload = Partial<CreateParcelTripPayload>;

export type CreateParcelRequestPayload = {
  itemType: string;
  weightKg: number;
  fromCountry: string;
  toCountry: string;
  flexibleFromDate: string;
  flexibleToDate: string;
};

export type UpdateParcelRequestPayload = Partial<CreateParcelRequestPayload>;

export type Conversation = {
  id: string;
  user1: { id: string; fullName: string };
  user2: { id: string; fullName: string };
  messages: Message[];
  updatedAt: string;
  matchRequestId?: string;
  parcelRequestId?: string;
  matchRequest?: {
    currencyPost: {
      haveCurrency: string;
      needCurrency: string;
      amount: string;
    }
  };
  parcelRequest?: {
    itemType: string;
    fromCountry: string;
    toCountry: string;
  };
};

export type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; fullName: string };
};

export type CreateConversationPayload = {
  targetUserId: string;
  matchRequestId?: string;
  parcelRequestId?: string;
};

export type ApiConfig = {
  baseUrl: string;
};

export class ApiClient {
  private readonly baseUrl: string;
  private accessToken: string | null;
  private refreshToken: string | null;
  private readonly storageKey: string;
  private initialized: Promise<void> | null = null;

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.accessToken = null;
    this.refreshToken = null;
    this.storageKey = 'muhajirone_auth';
  }

  async init() {
    if (this.initialized) {
      return this.initialized;
    }
    this.initialized = this.loadTokens();
    return this.initialized;
  }

  async setTokens(tokens: AuthTokens | null) {
    if (!tokens) {
      this.accessToken = null;
      this.refreshToken = null;
      await this.saveTokens();
      return;
    }
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    await this.saveTokens();
  }

  getAccessToken() {
    return this.accessToken;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  private async saveTokens() {
    if (!this.accessToken || !this.refreshToken) {
      await AsyncStorage.removeItem(this.storageKey);
      return;
    }
    const payload = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    };
    await AsyncStorage.setItem(this.storageKey, JSON.stringify(payload));
  }

  private async loadTokens() {
    try {
      const raw = await AsyncStorage.getItem(this.storageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as AuthTokens;
      this.accessToken = parsed.accessToken ?? null;
      this.refreshToken = parsed.refreshToken ?? null;
    } catch {
      await AsyncStorage.removeItem(this.storageKey);
    }
  }

  async requestOtp(payload: RequestOtpPayload): Promise<{ message: string }> {
    return this.post<{ message: string }>('/auth/request-otp', payload, false);
  }

  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthTokens> {
    const tokens = await this.post<AuthTokens>('/auth/verify-otp', payload, false);
    await this.setTokens(tokens);
    return tokens;
  }

  async googleLogin(token: string, deviceFingerprint: string): Promise<AuthTokens> {
    const tokens = await this.post<AuthTokens>('/auth/google-login', { token, deviceFingerprint }, false);
    await this.setTokens(tokens);
    return tokens;
  }

  async linkPhone(payload: LinkPhonePayload): Promise<AuthTokens> {
    const tokens = await this.post<AuthTokens>('/auth/link-phone', payload, true);
    await this.setTokens(tokens);
    return tokens;
  }

  async refreshTokens() {
    if (!this.refreshToken) {
      throw new Error('No refresh token');
    }
    const next = await this.post<AuthTokens>(
      '/auth/refresh',
      {
        refreshToken: this.refreshToken,
      } satisfies RefreshTokenPayload,
      false,
    );
    await this.setTokens(next);
    return next;
  }

  async getMe() {
    return this.get<User>('/users/me');
  }

  async getMyStats() {
    return this.get('/users/me/stats');
  }

  async listUsers() {
    const response = await this.get<{ items: User[] }>('/users');
    return response.items;
  }

  async suspendUser(userId: string, isSuspended: boolean = true) {
    return this.patch(`/users/${userId}/suspend`, { isSuspended });
  }

  async verifyUser(userId: string, level: number = 1) {
    return this.patch(`/users/${userId}/verify`, { level });
  }

  async getUserStats(userId: string) {
    return this.get<{
      currencyPosts: number;
      parcelTrips: number;
      parcelRequests: number;
      totalPosts: number;
    }>(`/admin/dashboard/user-stats/${userId}`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      console.log(`Checking health at ${this.baseUrl}/...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log('Health check response:', response.status);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async updateProfile(payload: UpdateProfilePayload) {
    return this.patch('/users/me', payload);
  }

  async listCurrencyPosts(params?: {
    haveCurrency?: string;
    needCurrency?: string;
    city?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.get('/currency/posts', params);
  }

  async createCurrencyPost(payload: CreateCurrencyPostPayload) {
    return this.post('/currency/posts', payload);
  }

  async updateCurrencyPost(id: string, payload: UpdateCurrencyPostPayload) {
    return this.patch(`/currency/posts/${id}`, payload);
  }

  async activateCurrencyPost(id: string) {
    return this.post(`/currency/posts/${id}/activate`, undefined);
  }

  async cancelCurrencyPost(id: string) {
    return this.post(`/currency/posts/${id}/cancel`, undefined);
  }

  async createMatchRequest(postId: string, payload: CreateMatchRequestPayload) {
    return this.post(`/currency/posts/${postId}/requests`, payload);
  }

  async listMatchRequests(role?: 'sent' | 'received' | 'all') {
    return this.get('/currency/requests', role ? { role } : undefined);
  }

  async acceptMatchRequest(requestId: string) {
    return this.post(`/currency/requests/${requestId}/accept`, undefined);
  }

  async rejectMatchRequest(requestId: string) {
    return this.post(`/currency/requests/${requestId}/reject`, undefined);
  }

  async cancelMatchRequest(requestId: string) {
    return this.post(`/currency/requests/${requestId}/cancel`, undefined);
  }

  async createParcelTrip(payload: CreateParcelTripPayload) {
    return this.post('/parcel/trips', payload);
  }

  async listParcelTrips(params?: {
    fromCountry?: string;
    toCountry?: string;
    departureFrom?: string;
    departureTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.get('/parcel/trips', params);
  }

  async listMyParcelTrips() {
    return this.get('/parcel/trips/mine');
  }

  async createParcelRequest(payload: CreateParcelRequestPayload) {
    return this.post('/parcel/requests', payload);
  }

  async updateParcelTrip(id: string, payload: UpdateParcelTripPayload) {
    return this.patch(`/parcel/trips/${id}`, payload);
  }

  async updateParcelRequest(id: string, payload: UpdateParcelRequestPayload) {
    return this.patch(`/parcel/requests/${id}`, payload);
  }

  async listParcelRequests(params?: {
    fromCountry?: string;
    toCountry?: string;
    flexibleFromDateFrom?: string;
    flexibleFromDateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.get('/parcel/requests', params);
  }

  async listMyParcelRequests() {
    return this.get('/parcel/requests/mine');
  }

  async requestParcelMatch(requestId: string, tripId: string) {
    return this.post(`/parcel/requests/${requestId}/match`, { tripId });
  }

  async acceptParcelMatch(requestId: string) {
    return this.post(`/parcel/requests/${requestId}/accept`, undefined);
  }

  async rejectParcelMatch(requestId: string) {
    return this.post(`/parcel/requests/${requestId}/reject`, undefined);
  }

  async searchTripsForRequest(requestId: string) {
    return this.get(`/parcel/requests/${requestId}/matches`);
  }

  async searchRequestsForTrip(tripId: string) {
    return this.get(`/parcel/trips/${tripId}/matches`);
  }

  async completeParcelTrip(tripId: string) {
    return this.post(`/parcel/trips/${tripId}/complete`, undefined);
  }

  async completeParcelRequest(requestId: string) {
    return this.post(`/parcel/requests/${requestId}/complete`, undefined);
  }

  async completeMatchRequest(requestId: string) {
    return this.post(`/currency/requests/${requestId}/complete`, undefined);
  }

  async createRating(payload: {
    matchRequestId?: string;
    parcelRequestId?: string;
    reliabilityScore: number;
    communicationScore: number;
    timelinessScore: number;
    comment?: string;
  }) {
    return this.post('/ratings', payload);
  }

  async createDispute(payload: {
    matchRequestId?: string;
    parcelRequestId?: string;
    reason: string;
  }) {
    return this.post('/disputes', payload);
  }

  async listMyDisputes() {
    return this.get<Dispute[]>('/disputes/me');
  }

  async listAllDisputes() {
    return this.get<Dispute[]>('/disputes');
  }

  async resolveDispute(disputeId: string, status: DisputeStatus) {
    return this.post(`/disputes/${disputeId}/resolve`, { status });
  }

  async listMyVerificationDocuments() {
    return this.get<VerificationDocument[]>('/verification/documents/me');
  }

  async uploadVerificationDocument(payload: {
    type: VerificationDocumentType;
    uri: string;
    name: string;
    mimeType: string;
  }) {
    const formData = new FormData();
    formData.append('type', payload.type);
    formData.append(
      'file',
      {
        uri: payload.uri,
        name: payload.name,
        type: payload.mimeType,
      } as any,
    );
    return this.postFormData<VerificationDocument>(
      '/verification/documents',
      formData,
    );
  }

  async listAllVerificationDocuments(params?: {
    status?: VerificationDocumentStatus;
    userId?: string;
  }) {
    return this.get<VerificationDocument[]>(
      '/admin/verification/documents',
      params,
    );
  }

  async reviewVerificationDocument(payload: {
    id: string;
    status: VerificationDocumentStatus;
    rejectionReason?: string;
  }) {
    return this.post<VerificationDocument>(
      `/admin/verification/documents/${payload.id}/review`,
      { status: payload.status, rejectionReason: payload.rejectionReason },
    );
  }

  async listFeatureIdeas() {
    return this.get<FeatureIdea[]>('/features');
  }

  async getFeatureIdea(slug: string) {
    return this.get<FeatureIdea>(`/features/${slug}`);
  }

  async toggleFeatureVote(slug: string) {
    return this.post<{ voted: boolean; voteCount: number }>(
      `/features/${slug}/vote`,
      undefined,
    );
  }

  async getConversations() {
    return this.get<Conversation[]>('/chat/conversations');
  }

  async getConversation(conversationId: string) {
    return this.get<Conversation>(`/chat/conversations/${conversationId}`);
  }

  async getMessages(conversationId: string) {
    return this.get<Message[]>(`/chat/conversations/${conversationId}/messages`);
  }

  async createConversation(payload: CreateConversationPayload) {
    return this.post<Conversation>('/chat/conversations', payload);
  }

  async sendMessage(conversationId: string, content: string) {
    return this.post<Message>('/chat/messages', { conversationId, content });
  }

  async registerPushToken(token: string) {
    return this.post('/notifications/push-token', { token });
  }

  private async get<TResponse = unknown>(
    path: string,
    query?: Record<string, unknown>,
  ): Promise<TResponse> {
    const url = this.buildUrl(path, query);
    const response = await this.fetchWithAuthRetry(url, {
      method: 'GET',
    });
    return this.handleResponse<TResponse>(response);
  }

  private async post<TResponse = unknown>(
    path: string,
    body: unknown,
    withAuth = true,
  ): Promise<TResponse> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithAuthRetry(
      url,
      {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      withAuth,
    );
    return this.handleResponse<TResponse>(response);
  }

  private async postFormData<TResponse = unknown>(
    path: string,
    formData: FormData,
  ): Promise<TResponse> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithAuthRetry(
      url,
      {
        method: 'POST',
        body: formData,
      },
      true,
      'form',
    );
    return this.handleResponse<TResponse>(response);
  }

  private async patch<TResponse = unknown>(
    path: string,
    body: unknown,
  ): Promise<TResponse> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithAuthRetry(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return this.handleResponse<TResponse>(response);
  }

  private buildUrl(path: string, query?: Record<string, unknown>) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    let url = `${this.baseUrl}${normalizedPath}`;
    if (!query) {
      return url;
    }
    const parts: string[] = [];
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }
      parts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      );
    }
    if (parts.length === 0) {
      return url;
    }
    url += `${url.includes('?') ? '&' : '?'}${parts.join('&')}`;
    return url;
  }

  private buildHeaders(
    withAuth: boolean,
    contentType: 'json' | 'form' = 'json',
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (contentType === 'json') {
      headers['Content-Type'] = 'application/json';
    }
    if (!withAuth) {
      delete headers.Authorization;
      return headers;
    }
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  private async fetchWithAuthRetry(
    url: string,
    init: RequestInit,
    withAuth = true,
    contentType: 'json' | 'form' = 'json',
  ): Promise<Response> {
    const firstHeaders = this.buildHeaders(withAuth, contentType);
    const first = await fetch(url, {
      ...init,
      headers: firstHeaders,
    });
    if (first.status !== 401 || !withAuth || !this.refreshToken) {
      return first;
    }
    try {
      await this.refreshTokens();
    } catch {
      await this.setTokens(null);
      return first;
    }
    const retryHeaders = this.buildHeaders(withAuth, contentType);
    return fetch(url, {
      ...init,
      headers: retryHeaders,
    });
  }

  private async handleResponse<TResponse>(response: Response): Promise<TResponse> {
    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const json = await response.json();
        const rawMessage = (json as any)?.message;
        if (typeof rawMessage === 'string') {
          message = rawMessage;
        } else if (Array.isArray(rawMessage) && rawMessage.length > 0) {
          message = String(rawMessage[0]);
        }
      } catch {
      }
      throw new Error(message);
    }
    if (response.status === 204) {
      return undefined as TResponse;
    }
    return (await response.json()) as TResponse;
  }
}

const extra = ((Constants as any)?.expoConfig?.extra ??
  (Constants as any)?.easConfig?.extra ??
  (Constants as any)?.manifest?.extra ??
  (Constants as any)?.manifest2?.extra ??
  {}) as any;
const configuredApiUrl =
  extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || undefined;

const defaultBaseUrl =
  configuredApiUrl ??
  (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://192.168.1.33:3000');

export const API_URL = defaultBaseUrl;
console.log('API URL:', API_URL);

export const apiClient = new ApiClient({
  baseUrl: defaultBaseUrl,
});

import { CurrencyService } from './currency.service';

jest.mock('../prisma/prisma.service', () => {
  class PrismaService {}
  return { PrismaService };
});

type CurrencyPostRecord = {
  id: string;
  userId: string;
  status: string;
  expiryDate: Date;
};

type MatchRequestRecord = {
  id: string;
  currencyPostId: string;
  requesterId: string;
  targetUserId: string;
  status: string;
  deletedAt?: Date | null;
};

describe('CurrencyService flow', () => {
  it('should create post, activate, match, accept, and complete', async () => {
    const posts: CurrencyPostRecord[] = [];
    const requests: MatchRequestRecord[] = [];

    const prisma = {
      currencyPost: {
        create: async ({ data }: any) => {
          const id = `post-${posts.length + 1}`;
          const record: CurrencyPostRecord = {
            id,
            userId: data.userId,
            status: data.status,
            expiryDate: data.expiryDate,
          };
          posts.push(record);
          return { id, ...data };
        },
        findUnique: async ({ where }: any) => {
          return posts.find((p) => p.id === where.id) ?? null;
        },
        count: async ({ where }: any) => {
          return posts.filter(
            (p) => p.userId === where.userId && p.status === where.status,
          ).length;
        },
        update: async ({ where, data }: any) => {
          const post = posts.find((p) => p.id === where.id);
          if (!post) {
            return null;
          }
          if (typeof data.status === 'string') {
            post.status = data.status;
          }
          if (data.expiryDate instanceof Date) {
            post.expiryDate = data.expiryDate;
          }
          return { ...post, ...data };
        },
      },
      currencyMatchRequest: {
        findFirst: async ({ where }: any) => {
          return (
            requests.find(
              (r) =>
                r.currencyPostId === where.currencyPostId &&
                r.requesterId === where.requesterId,
            ) ?? null
          );
        },
        create: async ({ data }: any) => {
          const id = `req-${requests.length + 1}`;
          const record: MatchRequestRecord = {
            id,
            currencyPostId: data.currencyPostId,
            requesterId: data.requesterId,
            targetUserId: data.targetUserId,
            status: data.status,
          };
          requests.push(record);
          return { id, ...data };
        },
        findMany: async ({ where }: any) => {
          if (where.requesterId && where.targetUserId) {
            return requests.filter(
              (r) =>
                r.requesterId === where.requesterId ||
                r.targetUserId === where.targetUserId,
            );
          }
          if (where.requesterId) {
            return requests.filter((r) => r.requesterId === where.requesterId);
          }
          if (where.targetUserId) {
            return requests.filter((r) => r.targetUserId === where.targetUserId);
          }
          return requests;
        },
        findUnique: async ({ where }: any) => {
          return requests.find((r) => r.id === where.id) ?? null;
        },
        update: async ({ where, data }: any) => {
          const req = requests.find((r) => r.id === where.id);
          if (!req) {
            return null;
          }
          if (typeof data.status === 'string') {
            req.status = data.status;
          }
          return { ...req, ...data };
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          requests.forEach((r) => {
            if (
              r.currencyPostId === where.currencyPostId &&
              r.id !== where.id.not &&
              r.status === where.status
            ) {
              if (typeof data.status === 'string') {
                r.status = data.status;
              }
              count += 1;
            }
          });
          return { count };
        },
      },
      stateChangeLog: {
        create: async () => {
          return undefined;
        },
      },
      $transaction: async (callback: any) => {
        return callback(prisma);
      },
    } as any;

    const service = new CurrencyService(prisma);
    const userOwner = 'user-owner';
    const userOther = 'user-other';

    const post = await service.createPost(userOwner, {
      haveCurrency: 'USD',
      needCurrency: 'AED',
      amount: 100,
      preferredRate: 3.6,
      city: 'Dubai',
      expiryDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    const activePost = await service.activatePost(userOwner, post.id);
    expect(activePost.status).toBe('active');

    const matchRequest = await service.createMatchRequest(
      userOther,
      post.id,
      {},
    );
    expect(matchRequest.status).toBe('pending');

    const acceptedRequest = await service.acceptMatchRequest(
      userOwner,
      matchRequest.id,
    );
    expect(acceptedRequest.status).toBe('accepted');

    const completedRequest = await service.completeMatchRequest(
      userOwner,
      matchRequest.id,
    );
    expect(completedRequest.status).toBe('completed');
  });
});

import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

jest.setTimeout(60000);

describe('Post-login Transactions (E2E)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  const resetDb = async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "Message","Conversation","Dispute","Rating","CurrencyMatchRequest","ParcelRequest","ParcelTrip","CurrencyPost","VerificationDocument","FeatureVote","FeatureIdea","PushToken","UserDevice","RefreshToken","OtpRequest","StateChangeLog","User" RESTART IDENTITY CASCADE;',
    );
  };

  const createUserAndToken = async (data: {
    phoneNumber: string;
    fullName: string;
    verificationLevel?: number;
    isAdmin?: boolean;
  }) => {
    const user = await prisma.user.create({
      data: {
        phoneNumber: data.phoneNumber,
        fullName: data.fullName,
        city: 'Dubai',
        corridor: 'GCC ↔ South Asia',
        verificationLevel: data.verificationLevel ?? 1,
        isAdmin: data.isAdmin ?? false,
      },
    });

    const accessToken = await jwt.signAsync({
      sub: user.id,
      phoneNumber: user.phoneNumber,
    });

    return { user, accessToken };
  };

  beforeAll(async () => {
    if (process.env.E2E_TEST_MODE !== '1') {
      throw new Error('Set E2E_TEST_MODE=1 to run destructive e2e tests');
    }

    const dbUrl = process.env.DATABASE_URL ?? '';
    const looksLikeTestDb = /(^|[_/])(test|e2e)([_/]|$)/i.test(dbUrl);
    if (!looksLikeTestDb && process.env.E2E_ALLOW_NON_TEST_DB !== '1') {
      throw new Error(
        'Refusing to run destructive e2e tests against a non-test DATABASE_URL. Use a Neon branch/db named with test/e2e, or set E2E_ALLOW_NON_TEST_DB=1 if you are absolutely sure.',
      );
    }

    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_jwt_secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    await resetDb();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('profile: getMe + update profile + stats', async () => {
    const { user, accessToken } = await createUserAndToken({
      phoneNumber: '+10000000001',
      fullName: 'User A',
    });

    const me1 = await request(app.getHttpServer())
      .get('/users/me')
      .set(authHeader(accessToken))
      .expect(200);

    expect(me1.body.id).toBe(user.id);

    await request(app.getHttpServer())
      .patch('/users/me')
      .set(authHeader(accessToken))
      .send({
        fullName: 'User A Updated',
        city: 'Abu Dhabi',
        corridor: 'UAE ↔ Pakistan',
      })
      .expect(200);

    const me2 = await request(app.getHttpServer())
      .get('/users/me')
      .set(authHeader(accessToken))
      .expect(200);

    expect(me2.body.fullName).toBe('User A Updated');
    expect(me2.body.city).toBe('Abu Dhabi');
    expect(me2.body.corridor).toBe('UAE ↔ Pakistan');

    const stats = await request(app.getHttpServer())
      .get('/users/me/stats')
      .set(authHeader(accessToken))
      .expect(200);

    expect(stats.body.exchanges).toBe(0);
    expect(stats.body.parcels).toBe(0);
    expect(stats.body.ratingCount).toBe(0);
  });

  it('tiers: admin verify user updates verificationLevel and trustScore', async () => {
    const { user: target, accessToken: targetToken } = await createUserAndToken(
      {
        phoneNumber: '+10000000002',
        fullName: 'Target',
        verificationLevel: 0,
      },
    );

    const { accessToken: adminToken } = await createUserAndToken({
      phoneNumber: '+10000000003',
      fullName: 'Admin',
      isAdmin: true,
      verificationLevel: 2,
    });

    const before = await request(app.getHttpServer())
      .get('/users/me')
      .set(authHeader(targetToken))
      .expect(200);

    expect(before.body.verificationLevel).toBe(0);

    const updated = await request(app.getHttpServer())
      .patch(`/users/${target.id}/verify`)
      .set(authHeader(adminToken))
      .send({ level: 2 })
      .expect(200);

    expect(updated.body.verificationLevel).toBe(2);

    const refreshed = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(refreshed.trustScore).toBe(20);
  });

  it('referrals: redeem + reward after first completed transaction', async () => {
    const { user: referrer, accessToken: referrerToken } =
      await createUserAndToken({
        phoneNumber: '+10000000004',
        fullName: 'Referrer',
      });
    const { accessToken: refereeToken } = await createUserAndToken({
      phoneNumber: '+10000000005',
      fullName: 'Referee',
    });

    const meReferrer = await request(app.getHttpServer())
      .get('/referrals/me')
      .set(authHeader(referrerToken))
      .expect(200);

    const code = meReferrer.body.code as string;
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThanOrEqual(6);

    await request(app.getHttpServer())
      .post('/referrals/redeem')
      .set(authHeader(refereeToken))
      .send({ code })
      .expect(201);

    const postRes = await request(app.getHttpServer())
      .post('/currency/posts')
      .set(authHeader(referrerToken))
      .send({
        haveCurrency: 'AED',
        needCurrency: 'PKR',
        amount: 100,
        preferredRate: 75,
        city: 'Dubai',
        expiryDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    const postId = postRes.body.id as string;

    await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/activate`)
      .set(authHeader(referrerToken))
      .send({})
      .expect(201);

    const reqRes = await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/requests`)
      .set(authHeader(refereeToken))
      .send({})
      .expect(201);

    const matchRequestId = reqRes.body.id as string;

    await request(app.getHttpServer())
      .post(`/currency/requests/${matchRequestId}/accept`)
      .set(authHeader(referrerToken))
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/currency/requests/${matchRequestId}/complete`)
      .set(authHeader(refereeToken))
      .send({})
      .expect(201);

    const referrerAfter = await request(app.getHttpServer())
      .get('/referrals/me')
      .set(authHeader(referrerToken))
      .expect(200);

    const refereeAfter = await request(app.getHttpServer())
      .get('/referrals/me')
      .set(authHeader(refereeToken))
      .expect(200);

    expect(Number(referrerAfter.body.stats.earnedAed)).toBe(20);
    expect(Number(refereeAfter.body.stats.earnedAed)).toBe(20);

    expect(refereeAfter.body.received?.referrerId).toBe(referrer.id);
    expect(refereeAfter.body.received?.status).toBe('rewarded');
  });

  it('currency: browse -> create -> activate -> request -> accept -> complete -> rate -> dispute -> chat', async () => {
    const { user: owner, accessToken: tokenA } = await createUserAndToken({
      phoneNumber: '+10000000011',
      fullName: 'Owner A',
    });
    const { user: requester, accessToken: tokenB } = await createUserAndToken({
      phoneNumber: '+10000000012',
      fullName: 'Requester B',
    });
    const { accessToken: adminToken } = await createUserAndToken({
      phoneNumber: '+10000000013',
      fullName: 'Admin',
      isAdmin: true,
      verificationLevel: 2,
    });

    const postRes = await request(app.getHttpServer())
      .post('/currency/posts')
      .set(authHeader(tokenA))
      .send({
        haveCurrency: 'AED',
        needCurrency: 'INR',
        amount: 1000,
        preferredRate: 22.5,
        city: 'Dubai',
        expiryDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    const postId = postRes.body.id as string;

    await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/activate`)
      .set(authHeader(tokenA))
      .send({})
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get('/currency/posts?haveCurrency=AED&needCurrency=INR&city=Dubai')
      .set(authHeader(tokenB))
      .expect(200);

    expect(Array.isArray(listRes.body.items)).toBe(true);
    expect(listRes.body.items.length).toBe(1);
    expect(listRes.body.items[0].id).toBe(postId);

    const reqRes = await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/requests`)
      .set(authHeader(tokenB))
      .send({ message: 'Interested' })
      .expect(201);

    const requestId = reqRes.body.id as string;
    expect(reqRes.body.status).toBe('pending');

    await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/requests`)
      .set(authHeader(tokenB))
      .send({})
      .expect(400);

    const accepted = await request(app.getHttpServer())
      .post(`/currency/requests/${requestId}/accept`)
      .set(authHeader(tokenA))
      .send({})
      .expect(201);

    expect(accepted.body.status).toBe('accepted');

    const completed = await request(app.getHttpServer())
      .post(`/currency/requests/${requestId}/complete`)
      .set(authHeader(tokenB))
      .send({})
      .expect(201);

    expect(completed.body.status).toBe('completed');

    const rating = await request(app.getHttpServer())
      .post('/ratings')
      .set(authHeader(tokenB))
      .send({
        matchRequestId: requestId,
        reliabilityScore: 5,
        communicationScore: 5,
        timelinessScore: 5,
        comment: 'Great',
      })
      .expect(201);

    expect(rating.body.matchRequestId).toBe(requestId);

    await request(app.getHttpServer())
      .post('/ratings')
      .set(authHeader(tokenB))
      .send({
        matchRequestId: requestId,
        reliabilityScore: 5,
        communicationScore: 5,
        timelinessScore: 5,
      })
      .expect(400);

    const listRatings = await request(app.getHttpServer())
      .get(`/ratings/user/${owner.id}`)
      .set(authHeader(tokenA))
      .expect(200);

    expect(Array.isArray(listRatings.body)).toBe(true);
    expect(listRatings.body.length).toBe(1);

    const disputeRes = await request(app.getHttpServer())
      .post('/disputes')
      .set(authHeader(tokenB))
      .send({ matchRequestId: requestId, reason: 'Issue reported' })
      .expect(201);

    const disputeId = disputeRes.body.id as string;
    expect(disputeRes.body.status).toBe('open');

    await request(app.getHttpServer())
      .post('/disputes')
      .set(authHeader(tokenB))
      .send({ matchRequestId: requestId, reason: 'Duplicate open dispute' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/disputes/${disputeId}/resolve`)
      .set(authHeader(adminToken))
      .send({ status: 'resolved_invalid' })
      .expect(201);

    const conv = await request(app.getHttpServer())
      .post('/chat/conversations')
      .set(authHeader(tokenA))
      .send({ targetUserId: requester.id, matchRequestId: requestId })
      .expect(201);

    const conversationId = conv.body.id as string;

    await request(app.getHttpServer())
      .post('/chat/messages')
      .set(authHeader(tokenA))
      .send({ conversationId, content: 'Hello' })
      .expect(201);

    const messages = await request(app.getHttpServer())
      .get(`/chat/conversations/${conversationId}/messages`)
      .set(authHeader(tokenB))
      .expect(200);

    expect(Array.isArray(messages.body)).toBe(true);
    expect(messages.body.length).toBe(1);
    expect(messages.body[0].content).toBe('Hello');

    const convoDetails = await request(app.getHttpServer())
      .get(`/chat/conversations/${conversationId}`)
      .set(authHeader(tokenB))
      .expect(200);

    expect(convoDetails.body.matchRequestId).toBe(requestId);
    expect(convoDetails.body.matchRequest.currencyPost.haveCurrency).toBe(
      'AED',
    );
  });

  it('currency: edit post (draft/active) + expiry validation + forbid editing after completion', async () => {
    const { accessToken: ownerToken } = await createUserAndToken({
      phoneNumber: '+10000000014',
      fullName: 'Owner',
    });

    const postRes = await request(app.getHttpServer())
      .post('/currency/posts')
      .set(authHeader(ownerToken))
      .send({
        haveCurrency: 'AED',
        needCurrency: 'PKR',
        amount: 1000,
        preferredRate: 75,
        city: 'Dubai',
        expiryDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    const postId = postRes.body.id as string;

    const updatedDraft = await request(app.getHttpServer())
      .patch(`/currency/posts/${postId}`)
      .set(authHeader(ownerToken))
      .send({
        amount: 1500,
        preferredRate: 76.5,
        city: 'Abu Dhabi',
      })
      .expect(200);

    expect(Number(updatedDraft.body.amount)).toBe(1500);
    expect(Number(updatedDraft.body.preferredRate)).toBe(76.5);
    expect(updatedDraft.body.city).toBe('Abu Dhabi');

    await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/activate`)
      .set(authHeader(ownerToken))
      .send({})
      .expect(201);

    const updatedActive = await request(app.getHttpServer())
      .patch(`/currency/posts/${postId}`)
      .set(authHeader(ownerToken))
      .send({ city: 'Sharjah' })
      .expect(200);

    expect(updatedActive.body.city).toBe('Sharjah');

    await request(app.getHttpServer())
      .patch(`/currency/posts/${postId}`)
      .set(authHeader(ownerToken))
      .send({ expiryDate: new Date(Date.now() - 60 * 1000).toISOString() })
      .expect(400);

    await prisma.currencyPost.update({
      where: { id: postId },
      data: { status: 'completed' },
    });

    await request(app.getHttpServer())
      .patch(`/currency/posts/${postId}`)
      .set(authHeader(ownerToken))
      .send({ city: 'Dubai' })
      .expect(400);
  });

  it('currency: cancel post cascades to pending match requests', async () => {
    const { accessToken: ownerToken } = await createUserAndToken({
      phoneNumber: '+10000000015',
      fullName: 'Owner',
    });
    const { accessToken: requesterToken } = await createUserAndToken({
      phoneNumber: '+10000000016',
      fullName: 'Requester',
    });

    const postRes = await request(app.getHttpServer())
      .post('/currency/posts')
      .set(authHeader(ownerToken))
      .send({
        haveCurrency: 'AED',
        needCurrency: 'INR',
        amount: 1000,
        preferredRate: 22.5,
        city: 'Dubai',
        expiryDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    const postId = postRes.body.id as string;

    await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/activate`)
      .set(authHeader(ownerToken))
      .send({})
      .expect(201);

    const reqRes = await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/requests`)
      .set(authHeader(requesterToken))
      .send({})
      .expect(201);

    const requestId = reqRes.body.id as string;

    const cancelledPost = await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/cancel`)
      .set(authHeader(ownerToken))
      .send({})
      .expect(201);

    expect(cancelledPost.body.status).toBe('cancelled');

    const cancelledReq = await prisma.currencyMatchRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    expect(cancelledReq.status).toBe('cancelled');

    await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/requests`)
      .set(authHeader(requesterToken))
      .send({})
      .expect(400);
  });

  it('currency: reject flow and requester cancel flow', async () => {
    const { accessToken: ownerToken } = await createUserAndToken({
      phoneNumber: '+10000000017',
      fullName: 'Owner',
    });
    const { accessToken: requesterToken } = await createUserAndToken({
      phoneNumber: '+10000000018',
      fullName: 'Requester',
    });

    const postRes = await request(app.getHttpServer())
      .post('/currency/posts')
      .set(authHeader(ownerToken))
      .send({
        haveCurrency: 'AED',
        needCurrency: 'PKR',
        amount: 1000,
        preferredRate: 75,
        city: 'Dubai',
        expiryDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    const postId = postRes.body.id as string;

    await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/activate`)
      .set(authHeader(ownerToken))
      .send({})
      .expect(201);

    const reqRes = await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/requests`)
      .set(authHeader(requesterToken))
      .send({})
      .expect(201);

    const requestId = reqRes.body.id as string;

    const rejected = await request(app.getHttpServer())
      .post(`/currency/requests/${requestId}/reject`)
      .set(authHeader(ownerToken))
      .send({})
      .expect(201);

    expect(rejected.body.status).toBe('rejected');

    await request(app.getHttpServer())
      .post(`/currency/requests/${requestId}/cancel`)
      .set(authHeader(requesterToken))
      .send({})
      .expect(400);

    const postRes2 = await request(app.getHttpServer())
      .post('/currency/posts')
      .set(authHeader(ownerToken))
      .send({
        haveCurrency: 'AED',
        needCurrency: 'INR',
        amount: 500,
        preferredRate: 22,
        city: 'Dubai',
        expiryDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    const postId2 = postRes2.body.id as string;

    await request(app.getHttpServer())
      .post(`/currency/posts/${postId2}/activate`)
      .set(authHeader(ownerToken))
      .send({})
      .expect(201);

    const reqRes2 = await request(app.getHttpServer())
      .post(`/currency/posts/${postId2}/requests`)
      .set(authHeader(requesterToken))
      .send({})
      .expect(201);

    const requestId2 = reqRes2.body.id as string;

    const cancelled = await request(app.getHttpServer())
      .post(`/currency/requests/${requestId2}/cancel`)
      .set(authHeader(requesterToken))
      .send({})
      .expect(201);

    expect(cancelled.body.status).toBe('cancelled');

    await request(app.getHttpServer())
      .post(`/currency/requests/${requestId2}/accept`)
      .set(authHeader(ownerToken))
      .send({})
      .expect(400);

    const sent = await request(app.getHttpServer())
      .get('/currency/requests?role=sent')
      .set(authHeader(requesterToken))
      .expect(200);
    expect(Array.isArray(sent.body)).toBe(true);
    expect(sent.body.length).toBeGreaterThanOrEqual(2);

    const received = await request(app.getHttpServer())
      .get('/currency/requests?role=received')
      .set(authHeader(ownerToken))
      .expect(200);
    expect(Array.isArray(received.body)).toBe(true);
    expect(received.body.length).toBeGreaterThanOrEqual(2);
  });

  it('currency: expiry transitions active posts to expired and hides them from browse', async () => {
    const { accessToken: ownerToken } = await createUserAndToken({
      phoneNumber: '+10000000019',
      fullName: 'Owner',
    });
    const { accessToken: viewerToken } = await createUserAndToken({
      phoneNumber: '+10000000020',
      fullName: 'Viewer',
    });

    const postRes = await request(app.getHttpServer())
      .post('/currency/posts')
      .set(authHeader(ownerToken))
      .send({
        haveCurrency: 'AED',
        needCurrency: 'INR',
        amount: 1000,
        preferredRate: 22.5,
        city: 'Dubai',
        expiryDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    const postId = postRes.body.id as string;

    await request(app.getHttpServer())
      .post(`/currency/posts/${postId}/activate`)
      .set(authHeader(ownerToken))
      .send({})
      .expect(201);

    await prisma.currencyPost.update({
      where: { id: postId },
      data: { expiryDate: new Date(Date.now() - 1000), status: 'active' },
    });

    const listRes = await request(app.getHttpServer())
      .get('/currency/posts?haveCurrency=AED&needCurrency=INR&city=Dubai')
      .set(authHeader(viewerToken))
      .expect(200);

    expect(listRes.body.items.length).toBe(0);

    const expired = await prisma.currencyPost.findUniqueOrThrow({
      where: { id: postId },
    });
    expect(expired.status).toBe('expired');
  });

  it('parcel: public trips -> request traveler -> accept -> reject restores -> complete -> rate -> dispute', async () => {
    const { user: traveler, accessToken: travelerToken } =
      await createUserAndToken({
        phoneNumber: '+10000000021',
        fullName: 'Traveler',
      });
    const { user: sender, accessToken: senderToken } = await createUserAndToken(
      {
        phoneNumber: '+10000000022',
        fullName: 'Sender',
      },
    );
    const { accessToken: adminToken } = await createUserAndToken({
      phoneNumber: '+10000000023',
      fullName: 'Admin',
      isAdmin: true,
      verificationLevel: 2,
    });

    const tripRes = await request(app.getHttpServer())
      .post('/parcel/trips')
      .set(authHeader(travelerToken))
      .send({
        fromCountry: 'UAE',
        toCountry: 'Pakistan',
        departureDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        arrivalDate: new Date(
          Date.now() + 9 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        maxWeightKg: 4,
        allowedCategories: 'Documents, Electronics',
      })
      .expect(201);

    const tripId = tripRes.body.id as string;

    const publicTrips = await request(app.getHttpServer())
      .get('/parcel/trips')
      .expect(200);
    expect(Array.isArray(publicTrips.body.items)).toBe(true);
    expect(publicTrips.body.items.length).toBe(1);
    expect(publicTrips.body.items[0].id).toBe(tripId);

    const reqRes = await request(app.getHttpServer())
      .post(`/parcel/trips/${tripId}/request`)
      .set(authHeader(senderToken))
      .send({
        itemType: 'Documents',
        description: 'Passport documents',
        weightKg: 1,
        declaredValueAed: 0,
      })
      .expect(201);

    const parcelRequestId = reqRes.body.id as string;
    expect(reqRes.body.status).toBe('pending');
    expect(reqRes.body.tripId).toBe(tripId);

    const acceptRes = await request(app.getHttpServer())
      .post(`/parcel/requests/${parcelRequestId}/accept`)
      .set(authHeader(travelerToken))
      .send({})
      .expect(201);

    expect(acceptRes.body.status).toBe('matched');

    const disputeRes = await request(app.getHttpServer())
      .post('/disputes')
      .set(authHeader(senderToken))
      .send({ parcelRequestId, reason: 'Parcel issue' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/disputes/${disputeRes.body.id}/resolve`)
      .set(authHeader(adminToken))
      .send({ status: 'under_review' })
      .expect(201);

    const rejectRes = await request(app.getHttpServer())
      .post(`/parcel/requests/${parcelRequestId}/reject`)
      .set(authHeader(senderToken))
      .send({})
      .expect(201);

    expect(rejectRes.body.status).toBe('active');
    expect(rejectRes.body.tripId).toBeNull();

    const reqRes2 = await request(app.getHttpServer())
      .post(`/parcel/trips/${tripId}/request`)
      .set(authHeader(senderToken))
      .send({
        itemType: 'Documents',
        description: 'Second attempt',
        weightKg: 1,
        declaredValueAed: 0,
      })
      .expect(201);

    const parcelRequestId2 = reqRes2.body.id as string;

    await request(app.getHttpServer())
      .post(`/parcel/requests/${parcelRequestId2}/accept`)
      .set(authHeader(travelerToken))
      .send({})
      .expect(201);

    const completed = await request(app.getHttpServer())
      .post(`/parcel/requests/${parcelRequestId2}/complete`)
      .set(authHeader(senderToken))
      .send({})
      .expect(201);

    expect(completed.body.status).toBe('completed');

    const rating = await request(app.getHttpServer())
      .post('/ratings')
      .set(authHeader(senderToken))
      .send({
        parcelRequestId: parcelRequestId2,
        reliabilityScore: 5,
        communicationScore: 5,
        timelinessScore: 5,
      })
      .expect(201);

    expect(rating.body.parcelRequestId).toBe(parcelRequestId2);
    expect(sender.id).toBeDefined();
    expect(traveler.id).toBeDefined();
  });

  it('parcel: edit trip + cancel trip unlinks pending requests and blocks further edits', async () => {
    const { accessToken: travelerToken } = await createUserAndToken({
      phoneNumber: '+10000000024',
      fullName: 'Traveler',
    });
    const { accessToken: senderToken } = await createUserAndToken({
      phoneNumber: '+10000000025',
      fullName: 'Sender',
    });

    const tripRes = await request(app.getHttpServer())
      .post('/parcel/trips')
      .set(authHeader(travelerToken))
      .send({
        fromCountry: 'UAE',
        toCountry: 'Pakistan',
        departureDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        arrivalDate: new Date(
          Date.now() + 9 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        maxWeightKg: 4,
        allowedCategories: 'Documents',
      })
      .expect(201);

    const tripId = tripRes.body.id as string;

    const updatedTrip = await request(app.getHttpServer())
      .patch(`/parcel/trips/${tripId}`)
      .set(authHeader(travelerToken))
      .send({ maxWeightKg: 6, allowedCategories: 'Documents, Electronics' })
      .expect(200);

    expect(updatedTrip.body.maxWeightKg).toBe(6);

    const reqRes = await request(app.getHttpServer())
      .post(`/parcel/trips/${tripId}/request`)
      .set(authHeader(senderToken))
      .send({
        itemType: 'Documents',
        description: 'Docs',
        weightKg: 1,
        declaredValueAed: 0,
      })
      .expect(201);

    const requestId = reqRes.body.id as string;
    expect(reqRes.body.status).toBe('pending');

    const cancelledTrip = await request(app.getHttpServer())
      .post(`/parcel/trips/${tripId}/cancel`)
      .set(authHeader(travelerToken))
      .send({})
      .expect(201);

    expect(cancelledTrip.body.status).toBe('cancelled');

    const resetRequest = await prisma.parcelRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    expect(resetRequest.status).toBe('active');
    expect(resetRequest.tripId).toBeNull();

    await request(app.getHttpServer())
      .patch(`/parcel/trips/${tripId}`)
      .set(authHeader(travelerToken))
      .send({ maxWeightKg: 7 })
      .expect(400);
  });

  it('parcel: edit request only while active + cancel flow blocks accept', async () => {
    const { accessToken: travelerToken } = await createUserAndToken({
      phoneNumber: '+10000000026',
      fullName: 'Traveler',
    });
    const { accessToken: senderToken } = await createUserAndToken({
      phoneNumber: '+10000000027',
      fullName: 'Sender',
    });

    const requestRes = await request(app.getHttpServer())
      .post('/parcel/requests')
      .set(authHeader(senderToken))
      .send({
        itemType: 'Documents',
        description: 'Initial',
        weightKg: 1,
        declaredValueAed: 0,
        fromCountry: 'UAE',
        toCountry: 'Pakistan',
        flexibleFromDate: new Date(
          Date.now() + 6 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        flexibleToDate: new Date(
          Date.now() + 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .expect(201);

    const parcelRequestId = requestRes.body.id as string;
    expect(requestRes.body.status).toBe('active');

    const updatedActive = await request(app.getHttpServer())
      .patch(`/parcel/requests/${parcelRequestId}`)
      .set(authHeader(senderToken))
      .send({ description: 'Updated' })
      .expect(200);

    expect(updatedActive.body.description).toBe('Updated');

    const tripRes = await request(app.getHttpServer())
      .post('/parcel/trips')
      .set(authHeader(travelerToken))
      .send({
        fromCountry: 'UAE',
        toCountry: 'Pakistan',
        departureDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        arrivalDate: new Date(
          Date.now() + 9 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        maxWeightKg: 4,
        allowedCategories: 'Documents',
      })
      .expect(201);

    const tripId = tripRes.body.id as string;

    const pending = await request(app.getHttpServer())
      .post(`/parcel/requests/${parcelRequestId}/match`)
      .set(authHeader(senderToken))
      .send({ tripId })
      .expect(201);

    expect(pending.body.status).toBe('pending');

    await request(app.getHttpServer())
      .patch(`/parcel/requests/${parcelRequestId}`)
      .set(authHeader(senderToken))
      .send({ description: 'Should fail' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/parcel/requests/${parcelRequestId}/accept`)
      .set(authHeader(senderToken))
      .send({})
      .expect(400);

    await request(app.getHttpServer())
      .post(`/parcel/requests/${parcelRequestId}/cancel`)
      .set(authHeader(senderToken))
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/parcel/requests/${parcelRequestId}/accept`)
      .set(authHeader(travelerToken))
      .send({})
      .expect(400);
  });

  it('parcel: expiry transitions trips/requests to expired and hides them from browse', async () => {
    const { accessToken: travelerToken } = await createUserAndToken({
      phoneNumber: '+10000000028',
      fullName: 'Traveler',
    });
    const { accessToken: senderToken } = await createUserAndToken({
      phoneNumber: '+10000000029',
      fullName: 'Sender',
    });

    const tripRes = await request(app.getHttpServer())
      .post('/parcel/trips')
      .set(authHeader(travelerToken))
      .send({
        fromCountry: 'UAE',
        toCountry: 'Pakistan',
        departureDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        arrivalDate: new Date(
          Date.now() + 9 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        maxWeightKg: 4,
        allowedCategories: 'Documents',
      })
      .expect(201);

    const tripId = tripRes.body.id as string;

    await prisma.parcelTrip.update({
      where: { id: tripId },
      data: { departureDate: new Date(Date.now() - 1000), status: 'active' },
    });

    const publicTrips = await request(app.getHttpServer())
      .get('/parcel/trips')
      .expect(200);
    expect(publicTrips.body.items.length).toBe(0);

    const expiredTrip = await prisma.parcelTrip.findUniqueOrThrow({
      where: { id: tripId },
    });
    expect(expiredTrip.status).toBe('expired');

    const requestRes = await request(app.getHttpServer())
      .post('/parcel/requests')
      .set(authHeader(senderToken))
      .send({
        itemType: 'Documents',
        description: 'Docs',
        weightKg: 1,
        declaredValueAed: 0,
        fromCountry: 'UAE',
        toCountry: 'Pakistan',
        flexibleFromDate: new Date(
          Date.now() + 1 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        flexibleToDate: new Date(
          Date.now() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .expect(201);

    const requestId = requestRes.body.id as string;

    await prisma.parcelRequest.update({
      where: { id: requestId },
      data: { flexibleToDate: new Date(Date.now() - 1000), status: 'active' },
    });

    const listRequests = await request(app.getHttpServer())
      .get('/parcel/requests')
      .expect(200);
    expect(listRequests.body.items.length).toBe(0);

    const expiredRequest = await prisma.parcelRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    expect(expiredRequest.status).toBe('expired');
  });

  it('parcel: capacity is enforced across multiple senders', async () => {
    const { accessToken: travelerToken } = await createUserAndToken({
      phoneNumber: '+10000000031',
      fullName: 'Traveler',
    });
    const { accessToken: senderB } = await createUserAndToken({
      phoneNumber: '+10000000032',
      fullName: 'Sender B',
    });
    const { accessToken: senderC } = await createUserAndToken({
      phoneNumber: '+10000000033',
      fullName: 'Sender C',
    });

    const tripRes = await request(app.getHttpServer())
      .post('/parcel/trips')
      .set(authHeader(travelerToken))
      .send({
        fromCountry: 'UAE',
        toCountry: 'India',
        departureDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        arrivalDate: new Date(
          Date.now() + 9 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        maxWeightKg: 4,
        allowedCategories: 'Documents',
      })
      .expect(201);

    const tripId = tripRes.body.id as string;

    await request(app.getHttpServer())
      .post(`/parcel/trips/${tripId}/request`)
      .set(authHeader(senderB))
      .send({
        itemType: 'Documents',
        description: 'Paperwork',
        weightKg: 3,
        declaredValueAed: 0,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/parcel/trips/${tripId}/request`)
      .set(authHeader(senderC))
      .send({
        itemType: 'Documents',
        description: 'Paperwork',
        weightKg: 2,
        declaredValueAed: 0,
      })
      .expect(400);

    const publicTrips = await request(app.getHttpServer())
      .get('/parcel/trips')
      .expect(200);
    expect(publicTrips.body.items[0].reservedWeightKg).toBeGreaterThanOrEqual(
      3,
    );
    expect(publicTrips.body.items[0].remainingWeightKg).toBeLessThanOrEqual(1);
  });

  it('disputes: 3 valid disputes against a user triggers suspension', async () => {
    const { user: target, accessToken: targetToken } = await createUserAndToken(
      {
        phoneNumber: '+10000000041',
        fullName: 'Target',
        verificationLevel: 1,
      },
    );
    const { accessToken: adminToken } = await createUserAndToken({
      phoneNumber: '+10000000042',
      fullName: 'Admin',
      isAdmin: true,
      verificationLevel: 2,
    });

    const makeCurrencyDispute = async (requesterPhone: string) => {
      const { accessToken: requesterToken } = await createUserAndToken({
        phoneNumber: requesterPhone,
        fullName: requesterPhone,
      });

      const postRes = await request(app.getHttpServer())
        .post('/currency/posts')
        .set(authHeader(targetToken))
        .send({
          haveCurrency: 'AED',
          needCurrency: 'PKR',
          amount: 100,
          preferredRate: 75,
          city: 'Dubai',
          expiryDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const postId = postRes.body.id as string;

      await request(app.getHttpServer())
        .post(`/currency/posts/${postId}/activate`)
        .set(authHeader(targetToken))
        .send({})
        .expect(201);

      const reqRes = await request(app.getHttpServer())
        .post(`/currency/posts/${postId}/requests`)
        .set(authHeader(requesterToken))
        .send({})
        .expect(201);

      const requestId = reqRes.body.id as string;

      await request(app.getHttpServer())
        .post(`/currency/requests/${requestId}/accept`)
        .set(authHeader(targetToken))
        .send({})
        .expect(201);

      const disputeRes = await request(app.getHttpServer())
        .post('/disputes')
        .set(authHeader(requesterToken))
        .send({ matchRequestId: requestId, reason: 'Valid dispute' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/disputes/${disputeRes.body.id}/resolve`)
        .set(authHeader(adminToken))
        .send({ status: 'resolved_valid' })
        .expect(201);
    };

    await makeCurrencyDispute('+10000000051');
    await makeCurrencyDispute('+10000000052');
    await makeCurrencyDispute('+10000000053');

    const suspended = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(suspended.isSuspended).toBe(true);

    await request(app.getHttpServer())
      .get('/users/me')
      .set(authHeader(targetToken))
      .expect(401);
  });
});

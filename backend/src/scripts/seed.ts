import fs from 'node:fs';
import path from 'node:path';
import {
  PrismaClient,
  User,
  CurrencyPost,
  CurrencyMatchRequest,
  ParcelTrip,
  ParcelRequest,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const m = /^([^=]+)=(.*)$/.exec(line.trim());
      if (m) {
        const key = m[1];
        const val = m[2].trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

function getPrisma(): PrismaClient {
  loadEnv();
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not found');
  }
  if (
    connectionString.includes('render.com') &&
    !/sslmode=/.test(connectionString)
  ) {
    connectionString =
      connectionString +
      (connectionString.includes('?') ? '&' : '?') +
      'sslmode=require';
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = getPrisma();

  const users = [
    {
      fullName: 'Amit Sharma',
      city: 'Mumbai',
      corridor: 'South Asia',
      phoneNumber: '+91-9876500001',
      email: 'amit.sharma@example.com',
    },
    {
      fullName: 'Priya Patel',
      city: 'Delhi',
      corridor: 'South Asia',
      phoneNumber: '+91-9876500002',
      email: 'priya.patel@example.com',
    },
    {
      fullName: 'Rahul Verma',
      city: 'Bengaluru',
      corridor: 'South Asia',
      phoneNumber: '+91-9876500003',
      email: 'rahul.verma@example.com',
    },
    {
      fullName: 'Ayesha Khan',
      city: 'Karachi',
      corridor: 'South Asia',
      phoneNumber: '+92-3030000001',
      email: 'ayesha.khan@example.com',
    },
    {
      fullName: 'Bilal Ahmed',
      city: 'Lahore',
      corridor: 'South Asia',
      phoneNumber: '+92-3030000002',
      email: 'bilal.ahmed@example.com',
    },
    {
      fullName: 'Zain Ali',
      city: 'Islamabad',
      corridor: 'South Asia',
      phoneNumber: '+92-3030000003',
      email: 'zain.ali@example.com',
    },
    {
      fullName: 'Nusrat Jahan',
      city: 'Dhaka',
      corridor: 'South Asia',
      phoneNumber: '+880-1700000001',
      email: 'nusrat.jahan@example.com',
    },
    {
      fullName: 'Tanvir Islam',
      city: 'Chittagong',
      corridor: 'South Asia',
      phoneNumber: '+880-1700000002',
      email: 'tanvir.islam@example.com',
    },
    {
      fullName: 'Nuwan Perera',
      city: 'Colombo',
      corridor: 'South Asia',
      phoneNumber: '+94-770000001',
      email: 'nuwan.perera@example.com',
    },
    {
      fullName: 'Dilani Silva',
      city: 'Kandy',
      corridor: 'South Asia',
      phoneNumber: '+94-770000002',
      email: 'dilani.silva@example.com',
    },
  ];

  const createdUsers: User[] = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { phoneNumber: u.phoneNumber },
      update: {
        fullName: u.fullName,
        city: u.city,
        corridor: u.corridor,
        email: u.email,
      },
      create: {
        phoneNumber: u.phoneNumber,
        email: u.email,
        fullName: u.fullName,
        city: u.city,
        corridor: u.corridor,
        verificationLevel: 1,
      },
    });
    createdUsers.push(user);
  }

  const seededUserIds = createdUsers.map((u) => u.id);
  await prisma.message.deleteMany({
    where: {
      conversation: {
        OR: [
          { user1Id: { in: seededUserIds } },
          { user2Id: { in: seededUserIds } },
        ],
      },
    },
  });
  await prisma.conversation.deleteMany({
    where: {
      OR: [
        { user1Id: { in: seededUserIds } },
        { user2Id: { in: seededUserIds } },
      ],
    },
  });
  await prisma.rating.deleteMany({
    where: {
      OR: [
        { fromUserId: { in: seededUserIds } },
        { toUserId: { in: seededUserIds } },
      ],
    },
  });
  await prisma.dispute.deleteMany({
    where: {
      OR: [
        { raisedByUserId: { in: seededUserIds } },
        { resolvedByAdminId: { in: seededUserIds } },
      ],
    },
  });
  await prisma.currencyMatchRequest.deleteMany({
    where: {
      OR: [
        { requesterId: { in: seededUserIds } },
        { targetUserId: { in: seededUserIds } },
      ],
    },
  });
  await prisma.currencyPost.deleteMany({
    where: { userId: { in: seededUserIds } },
  });
  await prisma.parcelRequest.deleteMany({
    where: { userId: { in: seededUserIds } },
  });
  await prisma.parcelTrip.deleteMany({
    where: { userId: { in: seededUserIds } },
  });
  await prisma.pushToken.deleteMany({
    where: { userId: { in: seededUserIds } },
  });
  await prisma.userDevice.deleteMany({
    where: { userId: { in: seededUserIds } },
  });
  await prisma.refreshToken.deleteMany({
    where: { userId: { in: seededUserIds } },
  });
  await prisma.stateChangeLog.deleteMany({
    where: { changedByUserId: { in: seededUserIds } },
  });

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const currencyPostsData = [
    {
      userIdx: 0,
      haveCurrency: 'INR',
      needCurrency: 'AED',
      amount: '120000',
      preferredRate: '0.044',
      city: 'Mumbai',
    },
    {
      userIdx: 1,
      haveCurrency: 'INR',
      needCurrency: 'USD',
      amount: '80000',
      preferredRate: '0.012',
      city: 'Delhi',
    },
    {
      userIdx: 3,
      haveCurrency: 'PKR',
      needCurrency: 'AED',
      amount: '500000',
      preferredRate: '0.013',
      city: 'Karachi',
    },
    {
      userIdx: 4,
      haveCurrency: 'PKR',
      needCurrency: 'USD',
      amount: '300000',
      preferredRate: '0.0036',
      city: 'Lahore',
    },
    {
      userIdx: 6,
      haveCurrency: 'BDT',
      needCurrency: 'AED',
      amount: '400000',
      preferredRate: '0.033',
      city: 'Dhaka',
    },
  ];

  const createdCurrencyPosts: CurrencyPost[] = [];
  for (const p of currencyPostsData) {
    const post = await prisma.currencyPost.create({
      data: {
        userId: createdUsers[p.userIdx].id,
        haveCurrency: p.haveCurrency,
        needCurrency: p.needCurrency,
        amount: p.amount,
        preferredRate: p.preferredRate,
        city: p.city,
        expiryDate: in30,
        status: 'active',
      },
    });
    createdCurrencyPosts.push(post);
  }

  const matchRequestsData = [
    { postIdx: 0, requesterIdx: 2, status: 'pending' },
    { postIdx: 1, requesterIdx: 2, status: 'completed' },
    { postIdx: 2, requesterIdx: 5, status: 'pending' },
    { postIdx: 4, requesterIdx: 7, status: 'accepted' },
    { postIdx: 3, requesterIdx: 6, status: 'disputed' },
  ];

  const createdMatchRequests: CurrencyMatchRequest[] = [];
  for (const m of matchRequestsData) {
    const post = createdCurrencyPosts[m.postIdx];
    const requester = createdUsers[m.requesterIdx];
    const mr = await prisma.currencyMatchRequest.create({
      data: {
        currencyPostId: post.id,
        requesterId: requester.id,
        targetUserId: post.userId,
        status: m.status as any,
      },
    });
    createdMatchRequests.push(mr);
  }

  const tripsData = [
    {
      userIdx: 8,
      fromCountry: 'Sri Lanka',
      toCountry: 'United Arab Emirates',
      departureDays: 10,
      arrivalDays: 12,
      maxWeightKg: 20,
      allowedCategories: 'Documents, Clothes',
      status: 'active',
    },
    {
      userIdx: 9,
      fromCountry: 'Sri Lanka',
      toCountry: 'Qatar',
      departureDays: 7,
      arrivalDays: 10,
      maxWeightKg: 15,
      allowedCategories: 'Documents, Electronics',
      status: 'active',
    },
    {
      userIdx: 0,
      fromCountry: 'India',
      toCountry: 'United Arab Emirates',
      departureDays: 5,
      arrivalDays: 7,
      maxWeightKg: 25,
      allowedCategories: 'Documents, Snacks',
      status: 'active',
    },
  ];

  const createdTrips: ParcelTrip[] = [];
  for (const t of tripsData) {
    const trip = await prisma.parcelTrip.create({
      data: {
        userId: createdUsers[t.userIdx].id,
        fromCountry: t.fromCountry,
        toCountry: t.toCountry,
        departureDate: new Date(
          now.getTime() + t.departureDays * 24 * 60 * 60 * 1000,
        ),
        arrivalDate: new Date(
          now.getTime() + t.arrivalDays * 24 * 60 * 60 * 1000,
        ),
        maxWeightKg: t.maxWeightKg,
        allowedCategories: t.allowedCategories,
        status: t.status as any,
      },
    });
    createdTrips.push(trip);
  }

  const requestsData = [
    {
      userIdx: 6,
      itemType: 'Documents',
      weightKg: 2,
      fromCountry: 'Bangladesh',
      toCountry: 'United Arab Emirates',
      fromDays: 3,
      toDays: 9,
      status: 'active',
    },
    {
      userIdx: 3,
      itemType: 'Clothes',
      weightKg: 5,
      fromCountry: 'Pakistan',
      toCountry: 'Qatar',
      fromDays: 4,
      toDays: 12,
      status: 'active',
    },
    {
      userIdx: 1,
      itemType: 'Electronics',
      weightKg: 3,
      fromCountry: 'India',
      toCountry: 'United Arab Emirates',
      fromDays: 2,
      toDays: 10,
      status: 'pending',
      tripIdx: 2,
      initiatedByIdx: 1,
    },
    {
      userIdx: 8,
      itemType: 'Snacks',
      weightKg: 4,
      fromCountry: 'Sri Lanka',
      toCountry: 'United Arab Emirates',
      fromDays: 5,
      toDays: 14,
      status: 'pending',
      tripIdx: 0,
      initiatedByIdx: 8,
    },
    {
      userIdx: 9,
      itemType: 'Books',
      weightKg: 6,
      fromCountry: 'Sri Lanka',
      toCountry: 'Qatar',
      fromDays: 6,
      toDays: 16,
      status: 'active',
    },
    {
      userIdx: 6,
      itemType: 'Medicines',
      weightKg: 1.5,
      fromCountry: 'Bangladesh',
      toCountry: 'United Arab Emirates',
      fromDays: 1,
      toDays: 8,
      status: 'completed',
      tripIdx: 0,
      initiatedByIdx: 6,
    },
    {
      userIdx: 4,
      itemType: 'Shoes',
      weightKg: 3,
      fromCountry: 'Pakistan',
      toCountry: 'Qatar',
      fromDays: 3,
      toDays: 11,
      status: 'matched',
      tripIdx: 1,
      initiatedByIdx: 4,
    },
  ];

  const createdParcelRequests: ParcelRequest[] = [];
  for (const r of requestsData) {
    const pr = await prisma.parcelRequest.create({
      data: {
        userId: createdUsers[r.userIdx].id,
        tripId:
          typeof r.tripIdx === 'number' ? createdTrips[r.tripIdx].id : null,
        matchInitiatedByUserId:
          typeof r.initiatedByIdx === 'number'
            ? createdUsers[r.initiatedByIdx].id
            : null,
        itemType: r.itemType,
        weightKg: r.weightKg,
        fromCountry: r.fromCountry,
        toCountry: r.toCountry,
        flexibleFromDate: new Date(
          now.getTime() + r.fromDays * 24 * 60 * 60 * 1000,
        ),
        flexibleToDate: new Date(
          now.getTime() + r.toDays * 24 * 60 * 60 * 1000,
        ),
        status: r.status as any,
      },
    });
    createdParcelRequests.push(pr);
  }

  const orderPair = (a: string, b: string): [string, string] =>
    a.localeCompare(b) <= 0 ? [a, b] : [b, a];

  for (const mr of createdMatchRequests.filter((m) => m.status !== 'pending')) {
    const [user1Id, user2Id] = orderPair(mr.requesterId, mr.targetUserId);
    const convo = await prisma.conversation.create({
      data: {
        user1Id,
        user2Id,
        matchRequestId: mr.id,
      },
    });

    const msg1 =
      mr.status === 'disputed'
        ? 'Hi, there is an issue with the exchange. Can we clarify?'
        : 'Hi! I saw your exchange post. Are you available today?';
    const msg2 =
      mr.status === 'completed'
        ? 'Yes, completed the exchange. Thanks!'
        : 'Yes, let’s confirm amount, rate, and location.';
    const msg3 =
      mr.status === 'disputed'
        ? 'The rate changed at meeting time. I want to raise a dispute.'
        : 'Great. I can meet near the metro station.';
    const msg4 = 'Okay, noted.';

    const sequence: Array<{ senderId: string; content: string }> = [
      { senderId: mr.requesterId, content: msg1 },
      { senderId: mr.targetUserId, content: msg2 },
      { senderId: mr.requesterId, content: msg3 },
      { senderId: mr.targetUserId, content: msg4 },
    ];

    for (const m of sequence) {
      await prisma.message.create({
        data: {
          conversationId: convo.id,
          senderId: m.senderId,
          content: m.content,
          isRead: true,
        },
      });
    }
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { updatedAt: new Date() },
    });
  }

  for (const pr of createdParcelRequests.filter((r) => r.tripId)) {
    const tripOwnerId = createdTrips.find((t) => t.id === pr.tripId)?.userId;
    if (!tripOwnerId) continue;
    const [user1Id, user2Id] = orderPair(pr.userId, tripOwnerId);
    const convo = await prisma.conversation.create({
      data: {
        user1Id,
        user2Id,
        parcelRequestId: pr.id,
      },
    });

    const msg1 = 'Hi! Can you carry my package on your trip?';
    const msg2 =
      pr.status === 'completed'
        ? 'Delivered successfully. Please confirm received.'
        : 'Yes, share pickup and delivery details.';
    const msg3 =
      pr.status === 'matched'
        ? 'Perfect. I will hand it over before departure.'
        : 'Thanks. I will send the address now.';
    const msg4 = 'Okay.';

    const sequence: Array<{ senderId: string; content: string }> = [
      { senderId: pr.userId, content: msg1 },
      { senderId: tripOwnerId, content: msg2 },
      { senderId: pr.userId, content: msg3 },
      { senderId: tripOwnerId, content: msg4 },
    ];

    for (const m of sequence) {
      await prisma.message.create({
        data: {
          conversationId: convo.id,
          senderId: m.senderId,
          content: m.content,
          isRead: true,
        },
      });
    }
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { updatedAt: new Date() },
    });
  }

  const completedMr = createdMatchRequests.find(
    (m) => m.status === 'completed',
  );
  if (completedMr) {
    await prisma.rating.create({
      data: {
        matchRequestId: completedMr.id,
        fromUserId: completedMr.requesterId,
        toUserId: completedMr.targetUserId,
        reliabilityScore: 5,
        communicationScore: 5,
        timelinessScore: 5,
        comment: 'Smooth exchange and clear communication.',
      },
    });
    await prisma.rating.create({
      data: {
        matchRequestId: completedMr.id,
        fromUserId: completedMr.targetUserId,
        toUserId: completedMr.requesterId,
        reliabilityScore: 5,
        communicationScore: 4,
        timelinessScore: 5,
        comment: 'On time and polite.',
      },
    });
  }

  const completedPr = createdParcelRequests.find(
    (r) => r.status === 'completed',
  );
  if (completedPr) {
    const tripOwnerId = createdTrips.find(
      (t) => t.id === completedPr.tripId,
    )?.userId;
    if (tripOwnerId) {
      await prisma.rating.create({
        data: {
          parcelRequestId: completedPr.id,
          fromUserId: completedPr.userId,
          toUserId: tripOwnerId,
          reliabilityScore: 5,
          communicationScore: 5,
          timelinessScore: 5,
          comment: 'Delivered safely. Highly recommended.',
        },
      });
      await prisma.rating.create({
        data: {
          parcelRequestId: completedPr.id,
          fromUserId: tripOwnerId,
          toUserId: completedPr.userId,
          reliabilityScore: 5,
          communicationScore: 4,
          timelinessScore: 5,
          comment: 'Pickup was smooth and details were clear.',
        },
      });
    }
  }

  const disputedMr = createdMatchRequests.find((m) => m.status === 'disputed');
  if (disputedMr) {
    await prisma.dispute.create({
      data: {
        matchRequestId: disputedMr.id,
        raisedByUserId: disputedMr.requesterId,
        reason: 'Rate differed from agreed terms at meeting time.',
        status: 'open',
      },
    });
  }

  const disputedPr = createdParcelRequests.find((r) => r.status === 'matched');
  if (disputedPr) {
    await prisma.dispute.create({
      data: {
        parcelRequestId: disputedPr.id,
        raisedByUserId: disputedPr.userId,
        reason: 'Package pickup location changed last minute.',
        status: 'open',
      },
    });
  }

  await prisma.$disconnect();
  process.stdout.write('Seed complete\n');
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n');
  process.exit(1);
});

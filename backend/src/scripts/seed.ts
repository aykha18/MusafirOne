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
import { Pool } from 'pg';

const featureIdeas = [
  {
    slug: 'co-passenger',
    title: 'Co-Passenger',
    shortDescription:
      'Find a companion to assist elderly/child passengers on the same route.',
    longDescription:
      'Co-Passenger helps elderly travelers, children, and first-time flyers travel with confidence.\n\nType A: Shared-route companion — a traveler who is already flying posts their itinerary. A passenger needing assistance can connect and coordinate.\n\nType B: Paid companion — the passenger needing assistance pays for the companion’s tickets (to/from) plus an agreed service charge.\n\nSafety ideas: require stronger verification for companions, show trust score/ratings, add chat + itinerary confirmation, and support reporting/disputes.',
  },
  {
    slug: 'airport-pickup-drop',
    title: 'Airport Pickup & Drop',
    shortDescription:
      'Coordinate pickups/drops with trusted community members and transparent pricing.',
    longDescription:
      'Match travelers arriving/departing with verified drivers/helpers. Useful for late-night arrivals, new expats, and families with luggage. Include pickup point, baggage count, and optional child seat requirement.',
  },
  {
    slug: 'shared-luggage-space',
    title: 'Shared Luggage Space',
    shortDescription:
      'Share spare luggage allowance safely (no prohibited items, clear rules).',
    longDescription:
      'Let travelers with spare baggage allowance connect with people needing extra baggage space. Emphasize strict item restrictions, required receipts, and verification to reduce risk.',
  },
  {
    slug: 'document-checklist',
    title: 'Travel Document Checklist',
    shortDescription:
      'Personalized checklist for visas, permits, insurance, and arrival requirements.',
    longDescription:
      'A corridor-based checklist (origin/destination) that helps expats prepare the right documents. Include reminders and links to official sources.',
  },
  {
    slug: 'scam-alerts',
    title: 'Scam & Safety Alerts',
    shortDescription:
      'Community-reported scam patterns and safety tips for new arrivals.',
    longDescription:
      'Crowdsource verified scam alerts (with moderation). Show common red flags for currency exchange, parcel handling, or pickup scams.',
  },
  {
    slug: 'trusted-services',
    title: 'Trusted Services Directory',
    shortDescription:
      'Community-rated services: SIM cards, remittance, housing help, and more.',
    longDescription:
      'A curated directory for expats with ratings and dispute handling. Good for onboarding in a new city/corridor.',
  },
  {
    slug: 'trip-buddy',
    title: 'Trip Buddy (Same Flight/Route)',
    shortDescription:
      'Meet someone on the same flight/route to travel together or share taxis.',
    longDescription:
      'Helps reduce travel anxiety, enables shared transport on arrival, and supports first-time travelers. Similar to Co-Passenger but focused on peer companionship rather than assistance service.',
  },
  {
    slug: 'arrival-support',
    title: 'Arrival Support',
    shortDescription:
      'Help with first-day essentials: directions, local SIM, transit, and setup.',
    longDescription:
      'Connect new arrivals with locals/expats who can guide them through airport processes and initial city navigation. Include time-boxed sessions and clear pricing if paid.',
  },
];

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
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

async function seedFeatureIdeas(prisma: PrismaClient) {
  for (const f of featureIdeas) {
    await prisma.featureIdea.upsert({
      where: { slug: f.slug },
      update: {
        title: f.title,
        shortDescription: f.shortDescription,
        longDescription: f.longDescription,
        isActive: true,
      },
      create: {
        slug: f.slug,
        title: f.title,
        shortDescription: f.shortDescription,
        longDescription: f.longDescription,
        isActive: true,
      },
    });
  }
}

async function seedExchangeAggregator(prisma: PrismaClient) {
  const owner = await prisma.user.upsert({
    where: { phoneNumber: '+971-500009999' },
    update: {
      fullName: 'Exchange Admin',
      city: 'Dubai',
      corridor: 'GCC',
      verificationLevel: 3,
      isSuspended: false,
    },
    create: {
      phoneNumber: '+971-500009999',
      fullName: 'Exchange Admin',
      city: 'Dubai',
      corridor: 'GCC',
      verificationLevel: 3,
      trustScore: 0,
      isSuspended: false,
      isAdmin: false,
    },
  });

  const commonHours = JSON.stringify({
    weekly: {
      mon: [{ start: '09:00', end: '21:00' }],
      tue: [{ start: '09:00', end: '21:00' }],
      wed: [{ start: '09:00', end: '21:00' }],
      thu: [{ start: '09:00', end: '21:00' }],
      fri: [{ start: '14:00', end: '21:00' }],
      sat: [{ start: '09:00', end: '21:00' }],
      sun: [{ start: '09:00', end: '21:00' }],
    },
  });

  const businessesToSeed = [
    {
      name: 'Al Baraka Exchange',
      phone: '+971-4-0000001',
      whatsapp: '+971-50-0000001',
      website: 'https://example.com/albaraka',
      isVerified: true,
      city: 'Dubai',
      address: 'Deira, Dubai',
      lat: 25.2697,
      lng: 55.3095,
      offers: [
        {
          fromCurrency: 'SAR',
          toCurrency: 'INR',
          direction: 'buy',
          rate: '22.10',
        },
        {
          fromCurrency: 'SAR',
          toCurrency: 'INR',
          direction: 'sell',
          rate: '22.35',
        },
        {
          fromCurrency: 'AED',
          toCurrency: 'INR',
          direction: 'sell',
          rate: '22.75',
        },
      ],
    },
    {
      name: 'Lulu Exchange',
      phone: '+971-4-0000002',
      whatsapp: '+971-50-0000002',
      website: 'https://example.com/lulu',
      isVerified: false,
      city: 'Dubai',
      address: 'Karama, Dubai',
      lat: 25.2442,
      lng: 55.3031,
      offers: [
        {
          fromCurrency: 'SAR',
          toCurrency: 'INR',
          direction: 'sell',
          rate: '22.28',
        },
        {
          fromCurrency: 'AED',
          toCurrency: 'INR',
          direction: 'sell',
          rate: '22.62',
        },
      ],
    },
  ] as const;

  for (const b of businessesToSeed) {
    const existing = await prisma.business.findFirst({
      where: { name: b.name, type: 'exchange' },
    });
    const business =
      existing ??
      (await prisma.business.create({
        data: {
          ownerUserId: owner.id,
          type: 'exchange',
          name: b.name,
          phone: b.phone,
          whatsapp: b.whatsapp,
          website: b.website,
          status: 'active',
          isVerified: b.isVerified,
        },
      }));

    if (existing) {
      await prisma.business.update({
        where: { id: existing.id },
        data: {
          ownerUserId: owner.id,
          phone: b.phone,
          whatsapp: b.whatsapp,
          website: b.website,
          status: 'active',
          isVerified: b.isVerified,
        },
      });
    }

    let branch = await prisma.businessBranch.findFirst({
      where: {
        businessId: business.id,
        city: b.city,
        address: b.address,
      },
    });
    if (!branch) {
      branch = await prisma.businessBranch.create({
        data: {
          businessId: business.id,
          city: b.city,
          address: b.address,
          lat: b.lat,
          lng: b.lng,
          timeZone: 'Asia/Dubai',
          hoursJson: commonHours,
          isActive: true,
        },
      });
    } else {
      await prisma.businessBranch.update({
        where: { id: branch.id },
        data: {
          lat: b.lat,
          lng: b.lng,
          timeZone: 'Asia/Dubai',
          hoursJson: commonHours,
          isActive: true,
        },
      });
    }

    for (const offer of b.offers) {
      await prisma.exchangeOffer.upsert({
        where: {
          branchId_fromCurrency_toCurrency_direction: {
            branchId: branch.id,
            fromCurrency: offer.fromCurrency,
            toCurrency: offer.toCurrency,
            direction: offer.direction,
          },
        },
        update: {
          rate: offer.rate,
        },
        create: {
          branchId: branch.id,
          fromCurrency: offer.fromCurrency,
          toCurrency: offer.toCurrency,
          direction: offer.direction,
          rate: offer.rate,
        },
      });
    }
  }
}

async function main() {
  const prisma = getPrisma();

  if (process.env.SEED_EXCHANGES_ONLY === '1') {
    await seedExchangeAggregator(prisma);
    await prisma.$disconnect();
    process.stdout.write('Seed complete\n');
    return;
  }

  if (process.env.SEED_FEATURE_IDEAS_ONLY === '1') {
    await seedFeatureIdeas(prisma);
    await prisma.$disconnect();
    process.stdout.write('Seed complete\n');
    return;
  }

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
    {
      fullName: 'Hassan M.',
      city: 'Dubai',
      corridor: 'GCC',
      phoneNumber: '+971-500000101',
      email: 'hassan.m@example.com',
    },
    {
      fullName: 'Aisha T.',
      city: 'Abu Dhabi',
      corridor: 'GCC',
      phoneNumber: '+971-500000102',
      email: 'aisha.t@example.com',
    },
    {
      fullName: 'Bilal K.',
      city: 'Dubai',
      corridor: 'GCC',
      phoneNumber: '+971-500000103',
      email: 'bilal.k@example.com',
    },
    {
      fullName: 'Ahmed K.',
      city: 'Dubai',
      corridor: 'GCC',
      phoneNumber: '+971-500000104',
      email: 'ahmed.k@example.com',
    },
    {
      fullName: 'Fatima R.',
      city: 'Dubai',
      corridor: 'GCC',
      phoneNumber: '+971-500000105',
      email: 'fatima.r@example.com',
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
      userIdx: 10,
      fromCountry: 'Dubai (DXB)',
      toCountry: 'Mumbai (BOM)',
      departureDays: 3,
      arrivalDays: 4,
      maxWeightKg: 3,
      allowedCategories: 'Documents, Electronics',
      status: 'active',
    },
    {
      userIdx: 11,
      fromCountry: 'Abu Dhabi (AUH)',
      toCountry: 'Karachi (KHI)',
      departureDays: 6,
      arrivalDays: 7,
      maxWeightKg: 5,
      allowedCategories: 'Documents, Clothes',
      status: 'active',
    },
    {
      userIdx: 12,
      fromCountry: 'Dubai (DXB)',
      toCountry: 'Islamabad (ISB)',
      departureDays: 8,
      arrivalDays: 9,
      maxWeightKg: 4,
      allowedCategories: 'Clothes, Snacks',
      status: 'active',
    },
    {
      userIdx: 13,
      fromCountry: 'Dubai (DXB)',
      toCountry: 'Lahore (LHE)',
      departureDays: 5,
      arrivalDays: 6,
      maxWeightKg: 2,
      allowedCategories: 'Documents, Medicine',
      status: 'active',
    },
    {
      userIdx: 14,
      fromCountry: 'Dubai (DXB)',
      toCountry: 'Delhi (DEL)',
      departureDays: 9,
      arrivalDays: 10,
      maxWeightKg: 3,
      allowedCategories: 'Clothes, Food',
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
      userIdx: 0,
      itemType: 'Documents',
      description: 'Passport copies and forms',
      weightKg: 1.5,
      declaredValueAed: 200,
      fromCountry: 'Dubai (DXB)',
      toCountry: 'Mumbai (BOM)',
      fromDays: 1,
      toDays: 4,
      status: 'active',
    },
    {
      userIdx: 2,
      itemType: 'Electronics',
      description: 'Small phone accessories (sealed pack)',
      weightKg: 2.5,
      declaredValueAed: 450,
      fromCountry: 'Dubai (DXB)',
      toCountry: 'Delhi (DEL)',
      fromDays: 7,
      toDays: 10,
      status: 'active',
    },
    {
      userIdx: 5,
      itemType: 'Medicine',
      description: 'Over-the-counter medicines (no liquids)',
      weightKg: 1,
      declaredValueAed: 120,
      fromCountry: 'Dubai (DXB)',
      toCountry: 'Lahore (LHE)',
      fromDays: 4,
      toDays: 6,
      status: 'pending',
      tripIdx: 3,
      initiatedByIdx: 5,
    },
    {
      userIdx: 6,
      itemType: 'Clothes',
      description: 'Clothes in a small suitcase',
      weightKg: 4,
      declaredValueAed: 350,
      fromCountry: 'Abu Dhabi (AUH)',
      toCountry: 'Karachi (KHI)',
      fromDays: 5,
      toDays: 8,
      status: 'matched',
      tripIdx: 1,
      initiatedByIdx: 6,
    },
    {
      userIdx: 1,
      itemType: 'Snacks',
      description: 'Packaged snacks only',
      weightKg: 3,
      declaredValueAed: 80,
      fromCountry: 'Dubai (DXB)',
      toCountry: 'Islamabad (ISB)',
      fromDays: 6,
      toDays: 9,
      status: 'completed',
      tripIdx: 2,
      initiatedByIdx: 1,
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
        description:
          typeof (r as any).description === 'string'
            ? (r as any).description
            : null,
        weightKg: r.weightKg,
        declaredValueAed:
          typeof (r as any).declaredValueAed === 'number'
            ? (r as any).declaredValueAed
            : null,
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

  await seedFeatureIdeas(prisma);

  await prisma.$disconnect();
  process.stdout.write('Seed complete\n');
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n');
  process.exit(1);
});

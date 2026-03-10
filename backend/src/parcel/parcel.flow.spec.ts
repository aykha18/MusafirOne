import { ParcelService } from './parcel.service';

jest.mock('../prisma/prisma.service', () => {
  class PrismaService {}
  return { PrismaService };
});

type TripRecord = {
  id: string;
  userId: string;
  fromCountry: string;
  toCountry: string;
  departureDate: Date;
  arrivalDate: Date;
  status: string;
  deletedAt?: Date | null;
};

type RequestRecord = {
  id: string;
  userId: string;
  fromCountry: string;
  toCountry: string;
  flexibleFromDate: Date;
  flexibleToDate: Date;
  tripId?: string | null;
  status: string;
  deletedAt?: Date | null;
};

describe('ParcelService flow', () => {
  it('should create trip, request, match, and complete', async () => {
    const trips: TripRecord[] = [];
    const requests: RequestRecord[] = [];

    const prisma = {
      parcelTrip: {
        create: ({ data }: any) => {
          const id = `trip-${trips.length + 1}`;
          const record: TripRecord = {
            id,
            userId: data.userId,
            fromCountry: data.fromCountry,
            toCountry: data.toCountry,
            departureDate: data.departureDate,
            arrivalDate: data.arrivalDate,
            status: data.status,
          };
          trips.push(record);
          return { id, ...data };
        },
        findUnique: ({ where }: any) => {
          return trips.find((t) => t.id === where.id) ?? null;
        },
        update: ({ where, data }: any) => {
          const trip = trips.find((t) => t.id === where.id);
          if (!trip) {
            return null;
          }
          if (typeof data.status === 'string') {
            trip.status = data.status;
          }
          if (data.departureDate instanceof Date) {
            trip.departureDate = data.departureDate;
          }
          if (data.arrivalDate instanceof Date) {
            trip.arrivalDate = data.arrivalDate;
          }
          return { ...trip, ...data };
        },
        updateMany: ({ where, data }: any) => {
          let count = 0;
          trips.forEach((t) => {
            if (
              t.status === where.status &&
              t.departureDate <= where.departureDate.lte
            ) {
              if (typeof data.status === 'string') {
                t.status = data.status;
              }
              count += 1;
            }
          });
          return { count };
        },
        findMany: () => {
          return trips;
        },
        count: () => {
          return trips.length;
        },
      },
      parcelRequest: {
        create: ({ data }: any) => {
          const id = `req-${requests.length + 1}`;
          const record: RequestRecord = {
            id,
            userId: data.userId,
            fromCountry: data.fromCountry,
            toCountry: data.toCountry,
            flexibleFromDate: data.flexibleFromDate,
            flexibleToDate: data.flexibleToDate,
            tripId: data.tripId ?? null,
            status: data.status,
          };
          requests.push(record);
          return { id, ...data };
        },
        findUnique: ({ where }: any) => {
          return requests.find((r) => r.id === where.id) ?? null;
        },
        update: ({ where, data }: any) => {
          const request = requests.find((r) => r.id === where.id);
          if (!request) {
            return null;
          }
          if (typeof data.status === 'string') {
            request.status = data.status;
          }
          if (typeof data.tripId === 'string') {
            request.tripId = data.tripId;
          }
          return { ...request, ...data };
        },
        updateMany: ({ where, data }: any) => {
          let count = 0;
          requests.forEach((r) => {
            if (
              r.status === where.status &&
              r.flexibleToDate <= where.flexibleToDate.lte
            ) {
              if (typeof data.status === 'string') {
                r.status = data.status;
              }
              count += 1;
            }
          });
          return { count };
        },
        findMany: () => {
          return requests;
        },
        count: () => {
          return requests.length;
        },
      },
      stateChangeLog: {
        create: () => {
          return undefined;
        },
      },
      $transaction: (callback: any) => {
        return callback(prisma);
      },
    } as any;

    const service = new ParcelService(prisma);
    const travellerId = 'user-traveller';
    const senderId = 'user-sender';

    const departure = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const arrival = new Date(Date.now() + 4 * 60 * 60 * 1000);

    const trip = await service.createTrip(travellerId, {
      fromCountry: 'UAE',
      toCountry: 'KEN',
      departureDate: departure.toISOString(),
      arrivalDate: arrival.toISOString(),
      maxWeightKg: 20,
      allowedCategories: 'electronics,documents',
    });
    expect(trip.status).toBe('active');

    const fromWindow = new Date(Date.now() + 60 * 60 * 1000);
    const toWindow = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const request = await service.createRequest(senderId, {
      itemType: 'Laptop',
      weightKg: 2,
      fromCountry: 'UAE',
      toCountry: 'KEN',
      flexibleFromDate: fromWindow.toISOString(),
      flexibleToDate: toWindow.toISOString(),
    });
    expect(request.status).toBe('active');

    const matchedRequest = await service.matchRequestToTrip(
      travellerId,
      trip.id,
      request.id,
    );
    expect(matchedRequest.status).toBe('matched');
    expect(matchedRequest.tripId).toBe(trip.id);

    const completedRequest = await service.completeRequest(
      senderId,
      request.id,
    );
    expect(completedRequest.status).toBe('completed');
  });
});

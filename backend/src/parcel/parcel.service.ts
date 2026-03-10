import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrustService } from '../trust/trust.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateParcelTripDto } from './dto/create-parcel-trip.dto';
import { UpdateParcelTripDto } from './dto/update-parcel-trip.dto';
import { ListParcelTripsDto } from './dto/list-parcel-trips.dto';
import { CreateParcelRequestDto } from './dto/create-parcel-request.dto';
import { ListParcelRequestsDto } from './dto/list-parcel-requests.dto';

@Injectable()
export class ParcelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trustService: TrustService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createTrip(userId: string, dto: CreateParcelTripDto) {
    await this.validateUserEligibility(userId);

    const departureDate = new Date(dto.departureDate);
    const arrivalDate = new Date(dto.arrivalDate);
    if (
      Number.isNaN(departureDate.getTime()) ||
      Number.isNaN(arrivalDate.getTime())
    ) {
      throw new BadRequestException('Invalid dates');
    }
    if (arrivalDate < departureDate) {
      throw new BadRequestException(
        'Arrival date must be after or same as departure date',
      );
    }
    const now = new Date();
    if (departureDate <= now) {
      throw new BadRequestException('Departure date must be in the future');
    }
    const trip = await this.prisma.parcelTrip.create({
      data: {
        userId,
        fromCountry: dto.fromCountry,
        toCountry: dto.toCountry,
        departureDate,
        arrivalDate,
        maxWeightKg: dto.maxWeightKg,
        allowedCategories: dto.allowedCategories,
        status: 'active',
      },
    });
    return trip;
  }

  async listTrips(query: ListParcelTripsDto) {
    await this.expireOldTrips();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = {
      status: 'active',
      deletedAt: null,
      departureDate: {
        gt: new Date(),
      },
    };
    if (query.fromCountry) {
      where.fromCountry = query.fromCountry;
    }
    if (query.toCountry) {
      where.toCountry = query.toCountry;
    }
    if (query.departureFrom || query.departureTo) {
      const between: Record<string, Date> = {};
      if (query.departureFrom) {
        between.gte = new Date(query.departureFrom);
      }
      if (query.departureTo) {
        between.lte = new Date(query.departureTo);
      }
      where.departureDate = between;
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.parcelTrip.findMany({
        where,
        orderBy: {
          departureDate: 'asc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.parcelTrip.count({
        where,
      }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async listMyTrips(userId: string) {
    await this.expireOldTrips();
    return this.prisma.parcelTrip.findMany({
      where: {
        userId,
      },
      include: {
        parcelRequests: true,
      },
      orderBy: {
        departureDate: 'asc',
      },
    });
  }

  async updateTrip(userId: string, id: string, dto: UpdateParcelTripDto) {
    const trip = await this.prisma.parcelTrip.findUnique({
      where: {
        id,
      },
    });
    if (!trip || trip.deletedAt) {
      throw new NotFoundException('Trip not found');
    }
    if (trip.userId !== userId) {
      throw new ForbiddenException();
    }
    if (trip.status !== 'active') {
      throw new BadRequestException('Only active trips can be updated');
    }
    let departureDate = trip.departureDate;
    let arrivalDate = trip.arrivalDate;
    if (dto.departureDate) {
      const nextDeparture = new Date(dto.departureDate);
      if (Number.isNaN(nextDeparture.getTime())) {
        throw new BadRequestException('Invalid departure date');
      }
      departureDate = nextDeparture;
    }
    if (dto.arrivalDate) {
      const nextArrival = new Date(dto.arrivalDate);
      if (Number.isNaN(nextArrival.getTime())) {
        throw new BadRequestException('Invalid arrival date');
      }
      arrivalDate = nextArrival;
    }
    if (arrivalDate < departureDate) {
      throw new BadRequestException(
        'Arrival date must be after or same as departure date',
      );
    }
    const updated = await this.prisma.parcelTrip.update({
      where: {
        id,
      },
      data: {
        fromCountry: dto.fromCountry ?? undefined,
        toCountry: dto.toCountry ?? undefined,
        departureDate,
        arrivalDate,
        maxWeightKg: dto.maxWeightKg ?? undefined,
        allowedCategories: dto.allowedCategories ?? undefined,
      },
    });
    return updated;
  }

  async cancelTrip(userId: string, id: string) {
    const trip = await this.prisma.parcelTrip.findUnique({
      where: {
        id,
      },
      include: {
        parcelRequests: {
          where: {
            status: {
              in: ['pending', 'matched'],
            },
          },
        },
      },
    });
    if (!trip || trip.deletedAt) {
      throw new NotFoundException('Trip not found');
    }
    if (trip.userId !== userId) {
      throw new ForbiddenException();
    }
    if (trip.status !== 'active') {
      throw new BadRequestException('Only active trips can be cancelled');
    }

    // Handle associated requests
    if (trip.parcelRequests.length > 0) {
      const requestIds = trip.parcelRequests.map((r) => r.id);

      // Notify request owners
      for (const req of trip.parcelRequests) {
        await this.notificationsService.sendPushNotification(
          req.userId,
          'Parcel Trip Cancelled',
          'The trip associated with your parcel request has been cancelled.',
          { requestId: req.id, tripId: id, type: 'parcel_trip_cancelled' },
        );
      }

      // Reset requests to active and unlink trip
      await this.prisma.parcelRequest.updateMany({
        where: {
          id: {
            in: requestIds,
          },
        },
        data: {
          tripId: null,
          status: 'active',
          matchInitiatedByUserId: null,
        },
      });
    }

    const updated = await this.prisma.parcelTrip.update({
      where: {
        id,
      },
      data: {
        status: 'cancelled',
      },
    });
    await this.logStateChange(
      'ParcelTrip',
      id,
      trip.status,
      updated.status,
      userId,
      'cancel',
    );
    return updated;
  }

  async completeTrip(userId: string, id: string) {
    const trip = await this.prisma.parcelTrip.findUnique({
      where: {
        id,
      },
    });
    if (!trip || trip.deletedAt) {
      throw new NotFoundException('Trip not found');
    }
    if (trip.userId !== userId) {
      throw new ForbiddenException();
    }
    if (trip.status !== 'active') {
      throw new BadRequestException('Only active trips can be completed');
    }
    const updated = await this.prisma.parcelTrip.update({
      where: {
        id,
      },
      data: {
        status: 'completed',
      },
    });
    await this.logStateChange(
      'ParcelTrip',
      id,
      trip.status,
      updated.status,
      userId,
      'complete',
    );
    return updated;
  }

  async createRequest(userId: string, dto: CreateParcelRequestDto) {
    await this.validateUserEligibility(userId);

    const from = new Date(dto.flexibleFromDate);
    const to = new Date(dto.flexibleToDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid dates');
    }
    if (to < from) {
      throw new BadRequestException(
        'Flexible to date must be after flexible from date',
      );
    }
    if (to <= new Date()) {
      throw new BadRequestException('Flexible window must be in the future');
    }
    const request = await this.prisma.parcelRequest.create({
      data: {
        userId,
        itemType: dto.itemType,
        weightKg: dto.weightKg,
        fromCountry: dto.fromCountry,
        toCountry: dto.toCountry,
        flexibleFromDate: from,
        flexibleToDate: to,
        status: 'active',
      },
    });
    return request;
  }

  async listRequests(query: ListParcelRequestsDto) {
    await this.expireOldRequests();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = {
      status: 'active',
      flexibleToDate: {
        gt: new Date(),
      },
    };
    if (query.fromCountry) {
      where.fromCountry = query.fromCountry;
    }
    if (query.toCountry) {
      where.toCountry = query.toCountry;
    }
    if (query.flexibleFromDateFrom || query.flexibleFromDateTo) {
      const between: Record<string, Date> = {};
      if (query.flexibleFromDateFrom) {
        between.gte = new Date(query.flexibleFromDateFrom);
      }
      if (query.flexibleFromDateTo) {
        between.lte = new Date(query.flexibleFromDateTo);
      }
      where.flexibleFromDate = between;
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.parcelRequest.findMany({
        where,
        include: { trip: true },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.parcelRequest.count({
        where,
      }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async listMyRequests(userId: string) {
    await this.expireOldRequests();
    return this.prisma.parcelRequest.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: { trip: true },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async cancelRequest(userId: string, id: string) {
    const request = await this.prisma.parcelRequest.findUnique({
      where: {
        id,
      },
      include: {
        trip: true,
      },
    });
    if (!request || request.deletedAt) {
      throw new NotFoundException('Request not found');
    }
    if (request.userId !== userId) {
      throw new ForbiddenException();
    }
    if (
      request.status !== 'active' &&
      request.status !== 'pending' &&
      request.status !== 'matched'
    ) {
      // Allow cancelling pending/matched requests too, reverting the match
      throw new BadRequestException(
        'Only active, pending, or matched requests can be cancelled',
      );
    }

    // Notify trip owner if matched/pending
    if (
      request.trip &&
      (request.status === 'pending' || request.status === 'matched')
    ) {
      await this.notificationsService.sendPushNotification(
        request.trip.userId,
        'Parcel Request Cancelled',
        'A parcel request matched with your trip has been cancelled.',
        {
          requestId: id,
          tripId: request.trip.id,
          type: 'parcel_request_cancelled',
        },
      );
    }

    const updated = await this.prisma.parcelRequest.update({
      where: {
        id,
      },
      data: {
        status: 'cancelled',
      },
    });
    await this.logStateChange(
      'ParcelRequest',
      id,
      request.status,
      updated.status,
      userId,
      'cancel',
    );
    return updated;
  }

  async requestMatch(userId: string, requestId: string, tripId: string) {
    const request = await this.prisma.parcelRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.deletedAt) {
      throw new NotFoundException('Request not found');
    }

    const trip = await this.prisma.parcelTrip.findUnique({
      where: { id: tripId },
    });
    if (!trip || trip.deletedAt) {
      throw new NotFoundException('Trip not found');
    }

    const isRequestOwner = request.userId === userId;
    const isTripOwner = trip.userId === userId;

    if (!isRequestOwner && !isTripOwner) {
      throw new ForbiddenException();
    }

    if (request.status !== 'active') {
      throw new BadRequestException('Only active requests can be matched');
    }

    if (trip.status !== 'active') {
      throw new BadRequestException('Trip is not active');
    }

    // Validate matching criteria
    if (
      request.fromCountry !== trip.fromCountry ||
      request.toCountry !== trip.toCountry
    ) {
      throw new BadRequestException('Countries do not match');
    }
    if (request.weightKg > trip.maxWeightKg) {
      throw new BadRequestException('Request weight exceeds trip capacity');
    }
    // Date check: Trip departure must be within request flexible window
    if (
      trip.departureDate < request.flexibleFromDate ||
      trip.departureDate > request.flexibleToDate
    ) {
      throw new BadRequestException('Trip date is outside request window');
    }

    const updated = await this.prisma.parcelRequest.update({
      where: { id: requestId },
      data: {
        tripId,
        status: 'pending',
        matchInitiatedByUserId: userId,
      },
    });

    await this.logStateChange(
      'ParcelRequest',
      requestId,
      request.status,
      updated.status,
      userId,
      'request_match',
      { tripId, initiatedBy: userId },
    );

    // Notify the other party
    const targetUserId =
      userId === request.userId ? trip.userId : request.userId;
    await this.notificationsService.sendPushNotification(
      targetUserId,
      'New Parcel Match Request',
      'Someone wants to match with your parcel request/trip',
      { requestId, type: 'parcel_match_request' },
    );

    return updated;
  }

  async acceptMatch(userId: string, requestId: string) {
    const request = await this.prisma.parcelRequest.findUnique({
      where: { id: requestId },
      include: { trip: true },
    });
    if (!request || request.deletedAt || !request.trip) {
      throw new NotFoundException('Request or associated trip not found');
    }

    const isRequestOwner = request.userId === userId;
    const isTripOwner = request.trip.userId === userId;

    if (!isRequestOwner && !isTripOwner) {
      throw new ForbiddenException();
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending approval');
    }

    if (request.matchInitiatedByUserId === userId) {
      throw new BadRequestException('Cannot accept your own match request');
    }

    const updated = await this.prisma.parcelRequest.update({
      where: { id: requestId },
      data: {
        status: 'matched',
      },
    });

    await this.logStateChange(
      'ParcelRequest',
      requestId,
      request.status,
      updated.status,
      userId,
      'accept_match',
    );

    if (request.matchInitiatedByUserId) {
      await this.notificationsService.sendPushNotification(
        request.matchInitiatedByUserId,
        'Parcel Match Accepted',
        'Your parcel match request has been accepted!',
        { requestId, type: 'parcel_match_accepted' },
      );
    }

    return updated;
  }

  async rejectMatch(userId: string, requestId: string) {
    const request = await this.prisma.parcelRequest.findUnique({
      where: { id: requestId },
      include: { trip: true },
    });
    if (!request || request.deletedAt) {
      throw new NotFoundException('Request not found');
    }

    // Trip owner OR Request owner can reject/cancel
    const isTripOwner = request.trip?.userId === userId;
    const isRequestOwner = request.userId === userId;

    if (!isTripOwner && !isRequestOwner) {
      throw new ForbiddenException();
    }

    if (request.status !== 'pending' && request.status !== 'matched') {
      throw new BadRequestException('Cannot reject/cancel in current status');
    }

    const updated = await this.prisma.parcelRequest.update({
      where: { id: requestId },
      data: {
        tripId: null,
        status: 'active',
        matchInitiatedByUserId: null,
      },
    });

    await this.logStateChange(
      'ParcelRequest',
      requestId,
      request.status,
      updated.status,
      userId,
      'reject_match',
    );

    if (request.matchInitiatedByUserId) {
      await this.notificationsService.sendPushNotification(
        request.matchInitiatedByUserId,
        'Parcel Match Rejected',
        'Your parcel match request has been rejected.',
        { requestId, type: 'parcel_match_rejected' },
      );
    }

    return updated;
  }

  async completeRequest(userId: string, requestId: string) {
    const request = await this.prisma.parcelRequest.findUnique({
      where: { id: requestId },
      include: { trip: true },
    });
    if (!request || request.deletedAt) {
      throw new NotFoundException('Request not found');
    }

    // Request owner confirms receipt? Or Trip owner confirms delivery?
    // Usually Receiver confirms receipt. Since we don't have Receiver user, maybe Request Owner confirms.
    if (request.userId !== userId) {
      throw new ForbiddenException();
    }

    if (request.status !== 'matched') {
      throw new BadRequestException('Only matched requests can be completed');
    }

    const updated = await this.prisma.parcelRequest.update({
      where: { id: requestId },
      data: { status: 'completed' },
    });

    await this.logStateChange(
      'ParcelRequest',
      requestId,
      request.status,
      updated.status,
      userId,
      'complete',
    );

    // Trigger Trust Score update for both parties
    await this.trustService.recalculateForUser(userId); // Request Owner
    if (request.trip?.userId) {
      await this.trustService.recalculateForUser(request.trip.userId); // Trip Owner
    }

    return updated;
  }

  async searchTripsForRequest(requestId: string) {
    const request = await this.prisma.parcelRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');

    return this.prisma.parcelTrip.findMany({
      where: {
        status: 'active',
        fromCountry: request.fromCountry,
        toCountry: request.toCountry,
        maxWeightKg: { gte: request.weightKg },
        departureDate: {
          gte: request.flexibleFromDate,
          lte: request.flexibleToDate,
        },
      },
    });
  }

  async searchRequestsForTrip(tripId: string) {
    const trip = await this.prisma.parcelTrip.findUnique({
      where: { id: tripId },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    return this.prisma.parcelRequest.findMany({
      where: {
        status: 'active',
        fromCountry: trip.fromCountry,
        toCountry: trip.toCountry,
        weightKg: { lte: trip.maxWeightKg },
        flexibleFromDate: { lte: trip.departureDate },
        flexibleToDate: { gte: trip.departureDate },
      },
    });
  }

  private async expireOldTrips() {
    await this.prisma.parcelTrip.updateMany({
      where: {
        status: 'active',
        departureDate: {
          lt: new Date(),
        },
      },
      data: {
        status: 'expired',
      },
    });
  }

  private async expireOldRequests() {
    await this.prisma.parcelRequest.updateMany({
      where: {
        status: 'active',
        flexibleToDate: {
          lt: new Date(),
        },
      },
      data: {
        status: 'expired',
      },
    });
  }

  private async logStateChange(
    entityType: string,
    entityId: string,
    fromState: string,
    toState: string,
    userId: string,
    reason: string,
    metadata?: Record<string, any>,
  ) {
    await this.prisma.stateChangeLog.create({
      data: {
        entityType,
        entityId,
        fromState,
        toState,
        changedByUserId: userId,
        reason,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  }

  private async validateUserEligibility(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.isSuspended) throw new ForbiddenException('User is suspended');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const dailyTripCount = await this.prisma.parcelTrip.count({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    const dailyRequestCount = await this.prisma.parcelRequest.count({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    if (dailyTripCount + dailyRequestCount >= 5) {
      throw new BadRequestException(
        'Daily parcel posting limit reached (5 posts/day)',
      );
    }
  }
}

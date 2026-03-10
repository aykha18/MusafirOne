import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrustService } from '../trust/trust.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trustService: TrustService,
  ) {}

  async create(fromUserId: string, dto: CreateRatingDto) {
    let toUserId: string;

    if (dto.matchRequestId) {
      const match = await this.prisma.currencyMatchRequest.findUnique({
        where: {
          id: dto.matchRequestId,
        },
      });
      if (!match || match.deletedAt) {
        throw new NotFoundException('Match not found');
      }
      if (match.status !== 'completed') {
        throw new BadRequestException('Only completed matches can be rated');
      }
      if (
        match.requesterId !== fromUserId &&
        match.targetUserId !== fromUserId
      ) {
        throw new BadRequestException('User not part of this match');
      }
      toUserId =
        match.requesterId === fromUserId
          ? match.targetUserId
          : match.requesterId;
    } else if (dto.parcelRequestId) {
      const request = await this.prisma.parcelRequest.findUnique({
        where: { id: dto.parcelRequestId },
        include: { trip: true },
      });
      if (!request || request.deletedAt) {
        throw new NotFoundException('Request not found');
      }
      if (request.status !== 'completed') {
        throw new BadRequestException('Only completed requests can be rated');
      }
      if (!request.trip) {
        throw new BadRequestException('Request is not linked to a trip');
      }

      const tripUserId = request.trip.userId;
      const requestUserId = request.userId;

      if (fromUserId === tripUserId) {
        // Trip owner rating Request owner
        toUserId = requestUserId;
      } else if (fromUserId === requestUserId) {
        // Request owner rating Trip owner
        toUserId = tripUserId;
      } else {
        throw new BadRequestException(
          'User not part of this parcel transaction',
        );
      }
    } else {
      throw new BadRequestException(
        'Either matchRequestId or parcelRequestId must be provided',
      );
    }

    const existing = await this.prisma.rating.findFirst({
      where: {
        matchRequestId: dto.matchRequestId,
        parcelRequestId: dto.parcelRequestId,
        fromUserId,
        toUserId,
      },
    });
    if (existing) {
      throw new BadRequestException('Rating already exists for this match');
    }
    const rating = await this.prisma.rating.create({
      data: {
        matchRequestId: dto.matchRequestId,
        parcelRequestId: dto.parcelRequestId,
        fromUserId,
        toUserId,
        reliabilityScore: dto.reliabilityScore,
        communicationScore: dto.communicationScore,
        timelinessScore: dto.timelinessScore,
        comment: dto.comment,
      },
    });
    await this.trustService.recalculateForUser(toUserId);
    return rating;
  }

  listForUser(userId: string) {
    return this.prisma.rating.findMany({
      where: {
        toUserId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrustService } from '../trust/trust.service';
import { DisputeStatus } from './disputes.types';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trustService: TrustService,
  ) {}

  async create(userId: string, dto: CreateDisputeDto) {
    if (dto.matchRequestId) {
      const match = await this.prisma.currencyMatchRequest.findUnique({
        where: { id: dto.matchRequestId },
      });
      if (!match || match.deletedAt) {
        throw new NotFoundException('Match not found');
      }
      if (match.requesterId !== userId && match.targetUserId !== userId) {
        throw new BadRequestException('User not part of this match');
      }
      if (match.status !== 'accepted' && match.status !== 'completed') {
        throw new BadRequestException(
          'Disputes allowed only for accepted or completed matches',
        );
      }
    } else if (dto.parcelRequestId) {
      const request = await this.prisma.parcelRequest.findUnique({
        where: { id: dto.parcelRequestId },
        include: { trip: true },
      });
      if (!request || request.deletedAt) {
        throw new NotFoundException('Request not found');
      }
      if (!request.trip) {
        throw new BadRequestException('Request is not matched to a trip');
      }
      const isRequestOwner = request.userId === userId;
      const isTripOwner = request.trip.userId === userId;
      
      if (!isRequestOwner && !isTripOwner) {
        throw new BadRequestException('User not part of this parcel transaction');
      }
      
      if (request.status !== 'matched' && request.status !== 'completed') {
        throw new BadRequestException(
          'Disputes allowed only for matched or completed parcel requests',
        );
      }
    } else {
      throw new BadRequestException('Either matchRequestId or parcelRequestId must be provided');
    }

    const existingOpen = await this.prisma.dispute.findFirst({
      where: {
        matchRequestId: dto.matchRequestId,
        parcelRequestId: dto.parcelRequestId,
        raisedByUserId: userId,
        status: {
          in: ['open', 'under_review'],
        },
      },
    });

    if (existingOpen) {
      throw new BadRequestException(
        'Open dispute already exists for this transaction',
      );
    }

    const dispute = await this.prisma.dispute.create({
      data: {
        matchRequestId: dto.matchRequestId,
        parcelRequestId: dto.parcelRequestId,
        raisedByUserId: userId,
        reason: dto.reason,
        status: 'open',
      },
    });
    return dispute;
  }

  listForUser(userId: string) {
    return this.prisma.dispute.findMany({
      where: {
        OR: [
          {
            matchRequest: {
              OR: [{ requesterId: userId }, { targetUserId: userId }],
            },
          },
          {
            parcelRequest: {
              OR: [
                { userId: userId },
                { trip: { userId: userId } },
              ],
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        matchRequest: { include: { currencyPost: true } },
        parcelRequest: { include: { trip: true } },
      },
    });
  }

  listAll() {
    return this.prisma.dispute.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        matchRequest: { include: { currencyPost: true } },
        parcelRequest: { include: { trip: true } },
      },
    });
  }

  async resolve(adminUserId: string, id: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: {
        id,
      },
      include: {
        matchRequest: true,
        parcelRequest: {
          include: {
            trip: true,
          },
        },
      },
    });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    if (
      dispute.status === 'resolved_valid' ||
      dispute.status === 'resolved_invalid'
    ) {
      throw new BadRequestException('Dispute already resolved');
    }
    if (
      dto.status !== DisputeStatus.RESOLVED_VALID &&
      dto.status !== DisputeStatus.RESOLVED_INVALID &&
      dto.status !== DisputeStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('Invalid resolution status');
    }
    const updated = await this.prisma.dispute.update({
      where: {
        id,
      },
      data: {
        status: dto.status,
        resolvedAt:
          dto.status === DisputeStatus.RESOLVED_VALID ||
          dto.status === DisputeStatus.RESOLVED_INVALID
            ? new Date()
            : null,
        resolvedByAdminId: adminUserId,
      },
    });

    let targetUserId: string;
    if (dispute.matchRequest) {
      targetUserId =
        dispute.raisedByUserId === dispute.matchRequest.requesterId
          ? dispute.matchRequest.targetUserId
          : dispute.matchRequest.requesterId;
    } else if (dispute.parcelRequest) {
      const requestOwner = dispute.parcelRequest.userId;
      const tripOwner = dispute.parcelRequest.trip?.userId;
      if (!tripOwner && dispute.raisedByUserId === requestOwner) {
          throw new BadRequestException('Trip owner not found');
      }
      targetUserId =
        dispute.raisedByUserId === requestOwner ? tripOwner! : requestOwner;
    } else {
      // Should not happen if data integrity is maintained
      return updated;
    }

    if (dto.status === DisputeStatus.RESOLVED_VALID) {
      const validCount = await this.countValidDisputesAgainst(targetUserId);
      if (validCount >= 3) {
        await this.prisma.user.update({
          where: {
            id: targetUserId,
          },
          data: {
            isSuspended: true,
          },
        });
      }
      await this.trustService.recalculateForUser(targetUserId);
    }
    return updated;
  }

  private async countValidDisputesAgainst(userId: string): Promise<number> {
    const disputes = await this.prisma.dispute.findMany({
      where: {
        status: 'resolved_valid',
        OR: [
          {
            matchRequest: {
              OR: [{ requesterId: userId }, { targetUserId: userId }],
            },
          },
          {
            parcelRequest: {
              userId: userId,
            },
          },
          {
            parcelRequest: {
              trip: {
                userId: userId,
              },
            },
          },
        ],
      },
    });
    return disputes.filter((d) => d.raisedByUserId !== userId).length;
  }
}

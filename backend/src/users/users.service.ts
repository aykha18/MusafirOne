import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrustService } from '../trust/trust.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trustService: TrustService,
  ) {}

  getById(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: {
        id,
      },
    });
  }

  async getStats(userId: string) {
    const [
      exchangeRequester,
      exchangeTarget,
      parcelReq,
      parcelTrips,
      ratingAgg,
      conversations,
    ] = await Promise.all([
      this.prisma.currencyMatchRequest.count({
        where: { requesterId: userId, status: 'completed', deletedAt: null },
      }),
      this.prisma.currencyMatchRequest.count({
        where: { targetUserId: userId, status: 'completed', deletedAt: null },
      }),
      this.prisma.parcelRequest.count({
        where: { userId, status: 'completed', deletedAt: null },
      }),
      this.prisma.parcelTrip.count({
        where: { userId, status: 'completed', deletedAt: null },
      }),
      this.prisma.rating.aggregate({
        where: { toUserId: userId },
        _avg: {
          reliabilityScore: true,
          communicationScore: true,
          timelinessScore: true,
        },
        _count: { _all: true },
      }),
      this.prisma.conversation.count({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      }),
    ]);

    const avgRel = ratingAgg._avg.reliabilityScore ?? null;
    const avgCom = ratingAgg._avg.communicationScore ?? null;
    const avgTim = ratingAgg._avg.timelinessScore ?? null;
    const hasAll =
      typeof avgRel === 'number' &&
      typeof avgCom === 'number' &&
      typeof avgTim === 'number';
    const ratingAvg = hasAll ? (avgRel + avgCom + avgTim) / 3 : null;

    return {
      exchanges: exchangeRequester + exchangeTarget,
      parcels: parcelReq + parcelTrips,
      ratingAvg,
      ratingCount: ratingAgg._count._all,
      community: conversations,
    };
  }

  updateProfile(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        fullName: dto.fullName ?? undefined,
        city: dto.city ?? undefined,
        corridor: dto.corridor ?? undefined,
      },
    });
  }

  async listAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        where: { deletedAt: null },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);
    return {
      items: users,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async suspendUser(id: string, isSuspended: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isSuspended },
    });
  }

  async verifyUser(id: string, level: number) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { verificationLevel: level },
    });
    await this.trustService.recalculateForUser(id);
    return updated;
  }
}

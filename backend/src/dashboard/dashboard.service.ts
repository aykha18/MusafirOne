import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisputeStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [totalUsers, activeDisputes, totalParcels, totalCurrencyPosts] =
      await Promise.all([
        this.prisma.user.count({
          where: { deletedAt: null },
        }),
        this.prisma.dispute.count({
          where: {
            status: {
              in: [DisputeStatus.open, DisputeStatus.under_review],
            },
          },
        }),
        this.prisma.parcelTrip.count(),
        this.prisma.currencyPost.count({
          where: { deletedAt: null },
        }),
      ]);

    return {
      totalUsers,
      activeDisputes,
      totalParcels,
      totalCurrencyPosts,
    };
  }

  async getUserStats(userId: string) {
    const [currencyPosts, parcelTrips, parcelRequests] = await Promise.all([
      this.prisma.currencyPost.count({
        where: { userId, deletedAt: null },
      }),
      this.prisma.parcelTrip.count({
        where: { userId, deletedAt: null },
      }),
      this.prisma.parcelRequest.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return {
      currencyPosts,
      parcelTrips,
      parcelRequests,
      totalPosts: currencyPosts + parcelTrips + parcelRequests,
    };
  }
}

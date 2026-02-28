import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrustService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculateForUser(userId: string): Promise<void> {
    const ratings = await this.prisma.rating.findMany({
      where: {
        toUserId: userId,
      },
    });
    let averageRating = 0;
    if (ratings.length > 0) {
      const total = ratings.reduce((sum, r) => {
        const overall =
          (r.reliabilityScore + r.communicationScore + r.timelinessScore) / 3;
        return sum + overall;
      }, 0);
      averageRating = total / ratings.length;
    }
    const completedCurrencyTransactions =
      await this.prisma.currencyMatchRequest.count({
        where: {
          status: 'completed',
          OR: [{ requesterId: userId }, { targetUserId: userId }],
        },
      });
      
    const completedParcelRequestsAsSender = await this.prisma.parcelRequest.count({
      where: {
        userId: userId,
        status: 'completed',
      },
    });

    const completedParcelRequestsAsCarrier = await this.prisma.parcelRequest.count({
      where: {
        trip: {
          userId: userId,
        },
        status: 'completed',
      },
    });

    const totalCompleted = completedCurrencyTransactions + completedParcelRequestsAsSender + completedParcelRequestsAsCarrier;

    const user = await this.prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
    });
    const validDisputesAgainst = await this.countValidDisputesAgainst(userId);
    const verificationBonus =
      user.verificationLevel === 2 ? 20 : user.verificationLevel === 1 ? 10 : 0;
    const disputePenalty = validDisputesAgainst * 5;
    let score =
      averageRating * 15 +
      Math.min(totalCompleted, 20) * 2 +
      verificationBonus -
      disputePenalty;
    if (score < 0) {
      score = 0;
    }
    if (score > 100) {
      score = 100;
    }
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        trustScore: Math.round(score),
      },
    });
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

    // Count only those NOT raised by me
    return disputes.filter((d) => d.raisedByUserId !== userId).length;
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const REWARD_AMOUNT_AED = '20.00';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const code = user.referralCode ?? (await this.ensureReferralCode(userId));

    const [sentCount, pendingCount, rewards] = await this.prisma.$transaction([
      this.prisma.referral.count({
        where: { referrerId: userId },
      }),
      this.prisma.referral.count({
        where: { referrerId: userId, status: 'pending' },
      }),
      this.prisma.referralReward.findMany({
        where: { userId },
        select: { amountAed: true },
      }),
    ]);

    const earnedAed = rewards.reduce((sum, r) => sum + Number(r.amountAed), 0);

    const received = await this.prisma.referral.findUnique({
      where: { refereeId: userId },
      select: { id: true, status: true, referrerId: true, rewardedAt: true },
    });

    return {
      code,
      stats: {
        sent: sentCount,
        pending: pendingCount,
        earnedAed,
      },
      received,
    };
  }

  async redeem(userId: string, codeRaw: string) {
    const code = codeRaw.trim().toUpperCase();
    if (!code) throw new BadRequestException('Invalid referral code');

    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true },
    });
    if (!me) throw new NotFoundException('User not found');

    if (me.referralCode && me.referralCode.toUpperCase() === code) {
      throw new BadRequestException('Cannot redeem your own referral code');
    }

    const existing = await this.prisma.referral.findUnique({
      where: { refereeId: userId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Referral code already redeemed');
    }

    const completedCount = await this.countCompletedTransactionsForUser(userId);
    if (completedCount > 0) {
      throw new BadRequestException(
        'Referral code can only be redeemed before your first transaction',
      );
    }

    const referrer = await this.prisma.user.findFirst({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!referrer) throw new BadRequestException('Referral code not found');
    if (referrer.id === userId) {
      throw new BadRequestException('Cannot redeem your own referral code');
    }

    return this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId: userId,
        status: 'pending',
      },
      select: {
        id: true,
        status: true,
        referrerId: true,
        refereeId: true,
        createdAt: true,
      },
    });
  }

  async onCompletedTransaction(userId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { refereeId: userId },
      select: { id: true, status: true, referrerId: true, refereeId: true },
    });
    if (!referral || referral.status !== 'pending') return;

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.referral.findUnique({
        where: { id: referral.id },
        select: { status: true },
      });
      if (!current || current.status !== 'pending') return;

      await tx.referral.update({
        where: { id: referral.id },
        data: { status: 'rewarded', rewardedAt: new Date() },
      });

      await tx.referralReward.createMany({
        data: [
          {
            referralId: referral.id,
            userId: referral.referrerId,
            type: 'referrer',
            amountAed: REWARD_AMOUNT_AED,
          },
          {
            referralId: referral.id,
            userId: referral.refereeId,
            type: 'referee',
            amountAed: REWARD_AMOUNT_AED,
          },
        ],
        skipDuplicates: true,
      });
    });
  }

  private async ensureReferralCode(userId: string) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = this.generateCode();
      const exists = await this.prisma.user.findFirst({
        where: { referralCode: candidate },
        select: { id: true },
      });
      if (exists) continue;

      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { referralCode: candidate },
        select: { referralCode: true },
      });
      return updated.referralCode as string;
    }
    throw new BadRequestException('Unable to generate referral code');
  }

  private generateCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(8);
    let out = '';
    for (let i = 0; i < 8; i += 1) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  }

  private async countCompletedTransactionsForUser(userId: string) {
    const [currencyCount, parcelCount] = await this.prisma.$transaction([
      this.prisma.currencyMatchRequest.count({
        where: {
          status: 'completed',
          deletedAt: null,
          OR: [{ requesterId: userId }, { targetUserId: userId }],
        },
      }),
      this.prisma.parcelRequest.count({
        where: {
          status: 'completed',
          deletedAt: null,
          OR: [{ userId }, { trip: { userId } }],
        },
      }),
    ]);
    return currencyCount + parcelCount;
  }
}

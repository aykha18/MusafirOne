import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessStatus, BusinessType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';
import { CreateExchangeConfirmationDto } from './dto/create-exchange-confirmation.dto';
import { CreateExchangeLeadDto } from './dto/create-exchange-lead.dto';
import { ListExchangesDto } from './dto/list-exchanges.dto';

type ExchangeListItem = {
  id: string;
  name: string;
  type: BusinessType;
  isVerified: boolean;
  status: BusinessStatus;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  openNow: boolean | null;
  ratingAvg: number | null;
  reviewCount: number;
  offerRate: string | null;
  offerUpdatedAt: string | null;
};

@Injectable()
export class ExchangesService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDecimalString(value: string | undefined, fieldName: string) {
    if (!value) return null;
    const trimmed = value.trim();
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      throw new BadRequestException(`${fieldName} must be a positive number`);
    }
    return trimmed;
  }

  private parseNumber(value: string | undefined, fieldName: string) {
    if (!value) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
    return n;
  }

  private haversineDistanceKm(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  }

  private getLocalWeekdayKey(timeZone?: string | null) {
    const weekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: timeZone ?? 'UTC',
    })
      .format(new Date())
      .toLowerCase();
    return weekday;
  }

  private getLocalTimeHHMM(timeZone?: string | null) {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timeZone ?? 'UTC',
    }).formatToParts(new Date());
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return `${hour}:${minute}`;
  }

  private isTimeInRange(nowHHMM: string, start: string, end: string) {
    if (!/^\d{2}:\d{2}$/.test(nowHHMM)) return false;
    if (!/^\d{2}:\d{2}$/.test(start)) return false;
    if (!/^\d{2}:\d{2}$/.test(end)) return false;
    if (start <= end) return nowHHMM >= start && nowHHMM <= end;
    return nowHHMM >= start || nowHHMM <= end;
  }

  private computeOpenNow(
    hoursJson: string | null | undefined,
    timeZone?: string | null,
  ) {
    if (!hoursJson) return null;
    let obj: any;
    try {
      obj = JSON.parse(hoursJson);
    } catch {
      return null;
    }
    const tz = timeZone ?? obj?.tz ?? obj?.timeZone ?? 'UTC';
    const weekly = obj?.weekly ?? obj;
    const weekdayKey = this.getLocalWeekdayKey(tz);
    const intervals = weekly?.[weekdayKey];
    if (!Array.isArray(intervals)) return null;
    const now = this.getLocalTimeHHMM(tz);
    for (const interval of intervals) {
      const start = interval?.start ?? interval?.[0];
      const end = interval?.end ?? interval?.[1];
      if (typeof start === 'string' && typeof end === 'string') {
        if (this.isTimeInRange(now, start, end)) return true;
      }
    }
    return false;
  }

  async listExchanges(query: ListExchangesDto) {
    const fromCurrency = query.fromCurrency?.toUpperCase();
    const toCurrency = query.toCurrency?.toUpperCase();
    const amount = this.parseDecimalString(query.amount, 'amount');

    const city = query.city?.trim();
    const openNow =
      query.openNow === '1' || query.openNow === 'true'
        ? true
        : query.openNow
          ? false
          : null;
    const userLat = this.parseNumber(query.lat, 'lat');
    const userLng = this.parseNumber(query.lng, 'lng');
    const sort = query.sort ?? 'bestRate';

    const businesses = await this.prisma.business.findMany({
      where: {
        status: 'active',
        type: 'exchange',
        branches: city
          ? {
              some: {
                isActive: true,
                city: {
                  equals: city,
                  mode: 'insensitive',
                },
              },
            }
          : {
              some: {
                isActive: true,
              },
            },
      },
      include: {
        branches: {
          where: city
            ? {
                isActive: true,
                city: {
                  equals: city,
                  mode: 'insensitive',
                },
              }
            : { isActive: true },
          include: {
            offers:
              fromCurrency && toCurrency
                ? {
                    where: {
                      fromCurrency,
                      toCurrency,
                    },
                  }
                : true,
          },
          take: 10,
        },
        reviews: {
          where: { isHidden: false },
          select: {
            rateFairnessScore: true,
            serviceScore: true,
            speedScore: true,
          },
        },
      },
    });

    const items = businesses
      .map<ExchangeListItem | null>((b) => {
        const branches = b.branches;
        if (branches.length === 0) return null;

        const reviewCount = b.reviews.length;
        const ratingAvg =
          reviewCount === 0
            ? null
            : b.reviews.reduce((acc, r) => {
                return acc + (r.rateFairnessScore + r.serviceScore + r.speedScore) / 3;
              }, 0) / reviewCount;

        let bestOfferRate: string | null = null;
        let bestOfferUpdatedAt: string | null = null;
        if (fromCurrency && toCurrency) {
          for (const br of branches) {
            const offers = Array.isArray(br.offers) ? br.offers : [];
            for (const o of offers) {
              const rate = o.rate?.toString?.() ?? null;
              if (!rate) continue;
              const minOk = amount
                ? !o.minAmount || Number(o.minAmount) <= Number(amount)
                : true;
              const maxOk = amount
                ? !o.maxAmount || Number(o.maxAmount) >= Number(amount)
                : true;
              if (!minOk || !maxOk) continue;
              if (!bestOfferRate || Number(rate) > Number(bestOfferRate)) {
                bestOfferRate = rate;
                bestOfferUpdatedAt = o.updatedAt?.toISOString?.() ?? null;
              }
            }
          }
        }

        let minDistanceKm: number | null = null;
        if (typeof userLat === 'number' && typeof userLng === 'number') {
          for (const br of branches) {
            if (typeof br.lat !== 'number' || typeof br.lng !== 'number') continue;
            const d = this.haversineDistanceKm(
              { lat: userLat, lng: userLng },
              { lat: br.lat, lng: br.lng },
            );
            if (minDistanceKm === null || d < minDistanceKm) minDistanceKm = d;
          }
        }

        let isOpenNow: boolean | null = null;
        for (const br of branches) {
          const open = this.computeOpenNow(br.hoursJson, br.timeZone);
          if (open === true) {
            isOpenNow = true;
            break;
          }
          if (open === false && isOpenNow === null) isOpenNow = false;
        }

        const representativeBranch =
          branches.find((br) => br.city && br.address) ?? branches[0];

        return {
          id: b.id,
          name: b.name,
          type: b.type,
          isVerified: b.isVerified,
          status: b.status,
          city: representativeBranch.city,
          address: representativeBranch.address,
          lat: representativeBranch.lat ?? null,
          lng: representativeBranch.lng ?? null,
          distanceKm: minDistanceKm,
          openNow: isOpenNow,
          ratingAvg,
          reviewCount,
          offerRate: bestOfferRate,
          offerUpdatedAt: bestOfferUpdatedAt,
        };
      })
      .filter((x): x is ExchangeListItem => x !== null);

    const filtered = openNow === true ? items.filter((i) => i.openNow === true) : items;

    if (sort === 'topRated') {
      filtered.sort((a, b) => (b.ratingAvg ?? -1) - (a.ratingAvg ?? -1));
    } else if (sort === 'bestRate') {
      filtered.sort((a, b) => {
        const ar = a.offerRate ? Number(a.offerRate) : -1;
        const br = b.offerRate ? Number(b.offerRate) : -1;
        return br - ar;
      });
    } else if (sort === 'nearby') {
      filtered.sort(
        (a, b) =>
          (a.distanceKm ?? Number.POSITIVE_INFINITY) -
          (b.distanceKm ?? Number.POSITIVE_INFINITY),
      );
    }

    return {
      items: filtered,
      query: {
        city: city ?? null,
        fromCurrency: fromCurrency ?? null,
        toCurrency: toCurrency ?? null,
        amount: amount ?? null,
        openNow,
        lat: userLat,
        lng: userLng,
      },
    };
  }

  async getExchange(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        branches: {
          where: { isActive: true },
          include: {
            offers: true,
          },
        },
        reviews: {
          where: { isHidden: false },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: {
              select: { id: true, fullName: true, verificationLevel: true },
            },
          },
        },
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.status !== 'active') {
      throw new NotFoundException('Business not found');
    }

    const reviewCount = business.reviews.length;
    const ratingAvg =
      reviewCount === 0
        ? null
        : business.reviews.reduce((acc, r) => {
            return acc + (r.rateFairnessScore + r.serviceScore + r.speedScore) / 3;
          }, 0) / reviewCount;

    return {
      ...business,
      ratingAvg,
      reviewCount,
    };
  }

  async listOffers(businessId: string, branchId?: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, status: true },
    });
    if (!business || business.status !== 'active') {
      throw new NotFoundException('Business not found');
    }

    const branches = await this.prisma.businessBranch.findMany({
      where: {
        businessId,
        isActive: true,
        ...(branchId ? { id: branchId } : undefined),
      },
      include: {
        offers: {
          orderBy: [{ updatedAt: 'desc' }],
        },
      },
    });
    return {
      businessId,
      branches,
    };
  }

  async createLead(userId: string, branchId: string, dto: CreateExchangeLeadDto) {
    const amount = this.parseDecimalString(dto.amount, 'amount');
    if (!amount) throw new BadRequestException('amount is required');

    const branch = await this.prisma.businessBranch.findUnique({
      where: { id: branchId },
      include: { business: true },
    });
    if (!branch || !branch.isActive || branch.business.status !== 'active') {
      throw new NotFoundException('Branch not found');
    }

    const lead = await this.prisma.exchangeLead.create({
      data: {
        userId,
        branchId,
        fromCurrency: dto.fromCurrency.toUpperCase(),
        toCurrency: dto.toCurrency.toUpperCase(),
        amount,
        channel: dto.channel as any,
      },
    });
    return { ...lead, status: 'recorded' as const };
  }

  async createConfirmation(
    userId: string,
    branchId: string,
    dto: CreateExchangeConfirmationDto,
  ) {
    const amount = this.parseDecimalString(dto.amount, 'amount');
    if (!amount) throw new BadRequestException('amount is required');
    const rateObserved = this.parseDecimalString(dto.rateObserved, 'rateObserved');

    const branch = await this.prisma.businessBranch.findUnique({
      where: { id: branchId },
      include: { business: true },
    });
    if (!branch || !branch.isActive || branch.business.status !== 'active') {
      throw new NotFoundException('Branch not found');
    }

    if (dto.offerId) {
      const offer = await this.prisma.exchangeOffer.findUnique({
        where: { id: dto.offerId },
        select: { id: true, branchId: true },
      });
      if (!offer || offer.branchId !== branchId) {
        throw new BadRequestException('Invalid offerId');
      }
    }

    const confirmation = await this.prisma.exchangeConfirmation.create({
      data: {
        userId,
        branchId,
        offerId: dto.offerId ?? null,
        fromCurrency: dto.fromCurrency.toUpperCase(),
        toCurrency: dto.toCurrency.toUpperCase(),
        amount,
        rateObserved: rateObserved ?? null,
        status: 'user_confirmed',
      },
    });

    return confirmation;
  }

  async createReview(userId: string, businessId: string, dto: CreateBusinessReviewDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business || business.status !== 'active') {
      throw new NotFoundException('Business not found');
    }

    const confirmation = await this.prisma.exchangeConfirmation.findUnique({
      where: { id: dto.confirmationId },
      include: { branch: true },
    });
    if (!confirmation || confirmation.userId !== userId) {
      throw new ForbiddenException();
    }
    if (confirmation.branch.businessId !== businessId) {
      throw new BadRequestException('Confirmation does not belong to this business');
    }

    const existing = await this.prisma.businessReview.findFirst({
      where: { confirmationId: dto.confirmationId },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Review already exists');

    return this.prisma.businessReview.create({
      data: {
        userId,
        businessId,
        branchId: confirmation.branchId,
        confirmationId: confirmation.id,
        rateFairnessScore: dto.rateFairnessScore,
        serviceScore: dto.serviceScore,
        speedScore: dto.speedScore,
        comment: dto.comment?.trim() ? dto.comment.trim() : null,
      },
    });
  }

  async adminListBusinesses(status?: string, type?: string) {
    return this.prisma.business.findMany({
      where: {
        ...(status ? { status: status as any } : undefined),
        ...(type ? { type: type as any } : undefined),
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        branches: { take: 5 },
      },
    });
  }

  async adminSetBusinessStatus(id: string, status: 'active' | 'rejected') {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    return this.prisma.business.update({
      where: { id },
      data: { status },
    });
  }

  async adminVerifyBusiness(id: string, isVerified: boolean) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    return this.prisma.business.update({
      where: { id },
      data: { isVerified },
    });
  }
}

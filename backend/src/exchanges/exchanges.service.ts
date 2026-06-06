import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { BusinessClaimRequestStatus, BusinessStatus, BusinessType } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { CreateBusinessClaimDto } from './dto/create-business-claim.dto';
import { CreateBusinessDto } from './dto/create-business.dto';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';
import { CreateExchangeConfirmationDto } from './dto/create-exchange-confirmation.dto';
import { CreateExchangeLeadDto } from './dto/create-exchange-lead.dto';
import { CreateExchangeRateAlertDto } from './dto/create-exchange-rate-alert.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateUmrahLeadDto } from './dto/create-umrah-lead.dto';
import { ListDirectoryBusinessesDto } from './dto/list-directory-businesses.dto';
import { ListExchangesDto } from './dto/list-exchanges.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

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
  offerIsStale: boolean | null;
};

type DirectoryBusinessListItem = {
  id: string;
  name: string;
  type: BusinessType;
  status: BusinessStatus;
  claimStatus: string;
  isVerified: boolean;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  openNow: boolean | null;
};

@Injectable()
export class ExchangesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private generateInPersonCode(): string {
    const n = randomBytes(3).readUIntBE(0, 3) % 900000;
    const value = 100000 + n;
    return value.toString();
  }

  private parseClaimDocs(docsJson: string | null): Array<{
    id: string;
    fileName: string;
    mimeType: string;
    storagePath: string;
    uploadedAt: string;
  }> {
    if (!docsJson) return [];
    try {
      const parsed = JSON.parse(docsJson) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((it) => ({
          id: String((it as any)?.id ?? ''),
          fileName: String((it as any)?.fileName ?? ''),
          mimeType: String((it as any)?.mimeType ?? ''),
          storagePath: String((it as any)?.storagePath ?? ''),
          uploadedAt: String((it as any)?.uploadedAt ?? ''),
        }))
        .filter((d) => d.id && d.fileName && d.mimeType && d.storagePath);
    } catch {
      return [];
    }
  }

  private getReviewCooldownDays() {
    const raw = Number(process.env.REVIEW_COOLDOWN_DAYS ?? 30);
    if (!Number.isFinite(raw) || raw <= 0) return 30;
    return raw;
  }

  private getOfferStaleHours() {
    const raw = Number(process.env.OFFER_STALE_HOURS ?? 12);
    if (!Number.isFinite(raw) || raw <= 0) return 12;
    return raw;
  }

  private isOfferStale(updatedAt: Date) {
    const staleHours = this.getOfferStaleHours();
    const ageMs = Date.now() - updatedAt.getTime();
    return ageMs > staleHours * 60 * 60 * 1000;
  }

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
                      direction: 'buy',
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
        let bestOfferIsStale: boolean | null = null;
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
                bestOfferIsStale =
                  o.updatedAt instanceof Date ? this.isOfferStale(o.updatedAt) : null;
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
          offerIsStale: bestOfferIsStale,
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

  async listDirectoryBusinesses(query: ListDirectoryBusinessesDto) {
    const city = query.city?.trim();
    const type = query.type;

    const businesses = await this.prisma.business.findMany({
      where: {
        status: 'active',
        type,
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
          orderBy: [{ createdAt: 'asc' }],
          take: 1,
        },
      },
      orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
      take: 500,
    });

    const items = businesses
      .map<DirectoryBusinessListItem | null>((b) => {
        const branch = b.branches[0] ?? null;
        if (!branch) return null;
        return {
          id: b.id,
          name: b.name,
          type: b.type,
          status: b.status,
          claimStatus: String((b as any).claimStatus ?? 'unclaimed'),
          isVerified: b.isVerified,
          phone: b.phone ?? null,
          whatsapp: b.whatsapp ?? null,
          website: b.website ?? null,
          city: branch.city,
          address: branch.address,
          lat: branch.lat ?? null,
          lng: branch.lng ?? null,
          openNow: this.computeOpenNow(branch.hoursJson ?? null, branch.timeZone ?? null),
        };
      })
      .filter((x): x is DirectoryBusinessListItem => Boolean(x));

    return { items, query: { type, city: city ?? null } };
  }

  async getDirectoryBusiness(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        branches: {
          where: { isActive: true },
          orderBy: [{ createdAt: 'asc' }],
          take: 20,
        },
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.status !== 'active') {
      throw new NotFoundException('Business not found');
    }

    return {
      ...business,
      claimStatus: String((business as any).claimStatus ?? 'unclaimed'),
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
      branches: business.branches.map((b) => ({
        ...b,
        offers: b.offers.map((o) => ({
          ...o,
          isStale: this.isOfferStale(o.updatedAt),
        })),
      })),
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
      branches: branches.map((b) => ({
        ...b,
        offers: b.offers.map((o) => ({
          ...o,
          isStale: this.isOfferStale(o.updatedAt),
        })),
      })),
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

    const cooldownDays = this.getReviewCooldownDays();
    const cutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);
    const recentCount = await this.prisma.businessReview.count({
      where: {
        userId,
        businessId,
        createdAt: { gte: cutoff },
      },
    });
    if (recentCount > 0) {
      throw new BadRequestException(
        `You can review this business once every ${cooldownDays} days`,
      );
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

  private async assertBusinessOwner(userId: string, businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerUserId !== userId) throw new ForbiddenException();
    return business;
  }

  private async assertBranchOwner(userId: string, branchId: string) {
    const branch = await this.prisma.businessBranch.findUnique({
      where: { id: branchId },
      include: { business: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    if (branch.business.ownerUserId !== userId) throw new ForbiddenException();
    return branch;
  }

  private async assertOfferOwner(userId: string, offerId: string) {
    const offer = await this.prisma.exchangeOffer.findUnique({
      where: { id: offerId },
      include: {
        branch: {
          include: {
            business: true,
          },
        },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.branch.business.ownerUserId !== userId) throw new ForbiddenException();
    return offer;
  }

  async ownerListMyBusinesses(userId: string) {
    return this.prisma.business.findMany({
      where: {
        ownerUserId: userId,
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        branches: {
          orderBy: [{ createdAt: 'asc' }],
          take: 20,
        },
      },
    });
  }

  async createBusinessClaim(
    userId: string,
    businessId: string,
    dto: CreateBusinessClaimDto,
  ) {
    const maxPendingRaw = Number(process.env.CLAIM_MAX_PENDING_PER_USER ?? 3);
    const maxPending = Number.isFinite(maxPendingRaw) && maxPendingRaw > 0 ? maxPendingRaw : 3;
    const cooldownHoursRaw = Number(process.env.CLAIM_RETRY_COOLDOWN_HOURS ?? 72);
    const cooldownHours =
      Number.isFinite(cooldownHoursRaw) && cooldownHoursRaw > 0 ? cooldownHoursRaw : 72;

    const myPendingCount = await this.prisma.businessClaim.count({
      where: { requesterUserId: userId, status: 'pending' },
    });
    if (myPendingCount >= maxPending) {
      throw new BadRequestException('Too many pending claims');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        status: true,
        ownerUserId: true,
        claimStatus: true,
        phone: true,
        whatsapp: true,
      },
    });
    if (!business || business.status !== 'active') {
      throw new NotFoundException('Business not found');
    }
    if (business.ownerUserId) {
      throw new BadRequestException('Business is already owned');
    }
    if (business.claimStatus === 'claimed') {
      throw new BadRequestException('Business is already claimed');
    }

    const lastMine = await this.prisma.businessClaim.findFirst({
      where: { businessId, requesterUserId: userId },
      orderBy: [{ createdAt: 'desc' }],
      select: { status: true, createdAt: true },
    });
    if (lastMine?.status === 'rejected') {
      const cutoff = Date.now() - cooldownHours * 60 * 60 * 1000;
      if (lastMine.createdAt.getTime() > cutoff) {
        throw new BadRequestException('Please wait before re-trying this claim');
      }
    }

    const existingPending = await this.prisma.businessClaim.findFirst({
      where: {
        businessId,
        status: 'pending',
      },
      select: { id: true },
    });
    if (existingPending) {
      throw new BadRequestException('A claim is already pending for this business');
    }

    let phoneToVerify = dto.phoneToVerify?.trim() ? dto.phoneToVerify.trim() : null;
    if (dto.method === 'phone_otp' && !phoneToVerify) {
      phoneToVerify = business.phone?.trim() ? business.phone.trim() : null;
      if (!phoneToVerify) {
        phoneToVerify = business.whatsapp?.trim() ? business.whatsapp.trim() : null;
      }
    }
    if (dto.method === 'phone_otp' && !phoneToVerify) {
      throw new BadRequestException('No phone number available for OTP verification');
    }

    const created = await this.prisma.businessClaim.create({
      data: {
        businessId,
        requesterUserId: userId,
        method: dto.method as any,
        phoneToVerify,
        docsJson: dto.docsJson?.trim() ? dto.docsJson.trim() : null,
        status: 'pending',
      },
      include: {
        business: { select: { id: true, name: true, type: true } },
      },
    });

    await this.prisma.business.update({
      where: { id: businessId },
      data: { claimStatus: 'claim_requested' },
    });

    if (dto.method === 'phone_otp' && phoneToVerify) {
      await this.authService.requestOtp({ phoneNumber: phoneToVerify });
    }

    return created;
  }

  async verifyBusinessClaimOtp(userId: string, businessId: string, code: string) {
    const claim = await this.prisma.businessClaim.findFirst({
      where: {
        businessId,
        requesterUserId: userId,
        status: 'pending',
        method: 'phone_otp',
      },
      include: { business: true },
      orderBy: [{ createdAt: 'desc' }],
    });
    if (!claim) throw new NotFoundException('Claim not found');
    const phone = claim.phoneToVerify?.trim() ? claim.phoneToVerify.trim() : null;
    if (!phone) throw new BadRequestException('No phone to verify');

    await this.authService.consumeOtpOrThrow(phone, code);

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.businessClaim.update({
        where: { id: claim.id },
        data: {
          status: 'approved',
          reviewedAt: now,
          reviewedByAdminId: null,
          rejectionReason: null,
        },
      }),
      this.prisma.business.update({
        where: { id: claim.businessId },
        data: {
          ownerUserId: claim.requesterUserId,
          claimStatus: 'claimed',
          claimedAt: now,
          claimedByUserId: claim.requesterUserId,
          status: claim.business.status === 'pending' ? 'active' : claim.business.status,
        },
      }),
    ]);

    return { ok: true as const, approved: true as const };
  }

  async verifyBusinessClaimCode(userId: string, businessId: string, code: string) {
    const claim = await this.prisma.businessClaim.findFirst({
      where: {
        businessId,
        requesterUserId: userId,
        status: 'pending',
        method: 'in_person_code',
      },
      include: {
        business: {
          select: {
            id: true,
            status: true,
            ownerUserId: true,
            claimStatus: true,
            claimCodeHash: true,
            claimCodeIssuedAt: true,
            claimCodeConsumedAt: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.business.ownerUserId) {
      throw new BadRequestException('Business is already owned');
    }
    if (claim.business.claimStatus === 'claimed') {
      throw new BadRequestException('Business is already claimed');
    }

    const issuedAt = claim.business.claimCodeIssuedAt;
    const consumedAt = claim.business.claimCodeConsumedAt;
    const storedHash = claim.business.claimCodeHash?.trim() ? claim.business.claimCodeHash.trim() : null;
    if (!storedHash || !issuedAt || consumedAt) {
      throw new BadRequestException('No active in-person code for this business');
    }

    const expiresMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - issuedAt.getTime() > expiresMs) {
      throw new BadRequestException('Code expired');
    }

    const providedHash = this.hashCode(code.trim());
    if (providedHash !== storedHash) {
      throw new BadRequestException('Invalid code');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.businessClaim.update({
        where: { id: claim.id },
        data: {
          status: 'approved',
          reviewedAt: now,
          reviewedByAdminId: null,
          rejectionReason: null,
        },
      }),
      this.prisma.business.update({
        where: { id: claim.businessId },
        data: {
          ownerUserId: claim.requesterUserId,
          claimStatus: 'claimed',
          claimedAt: now,
          claimedByUserId: claim.requesterUserId,
          status: claim.business.status === 'pending' ? 'active' : claim.business.status,
          claimCodeHash: null,
          claimCodeConsumedAt: now,
        },
      }),
    ]);

    return { ok: true as const, approved: true as const };
  }

  async resendBusinessClaimOtp(userId: string, businessId: string) {
    const claim = await this.prisma.businessClaim.findFirst({
      where: {
        businessId,
        requesterUserId: userId,
        status: 'pending',
        method: 'phone_otp',
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    if (!claim) throw new NotFoundException('Claim not found');

    const phone = claim.phoneToVerify?.trim() ? claim.phoneToVerify.trim() : null;
    if (!phone) throw new BadRequestException('No phone to verify');

    const cutoff = new Date(Date.now() - 60 * 1000);
    const recentOtp = await this.prisma.otpRequest.findFirst({
      where: {
        phoneNumber: phone,
        createdAt: { gt: cutoff },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: { id: true },
    });
    if (recentOtp) {
      throw new BadRequestException('Please wait before requesting another OTP');
    }

    await this.authService.requestOtp({ phoneNumber: phone });
    return { ok: true as const };
  }

  async uploadBusinessClaimDoc(
    userId: string,
    businessId: string,
    file: { fileName: string; mimeType: string; storagePath: string },
  ) {
    const maxPendingRaw = Number(process.env.CLAIM_MAX_PENDING_PER_USER ?? 3);
    const maxPending =
      Number.isFinite(maxPendingRaw) && maxPendingRaw > 0 ? maxPendingRaw : 3;
    const cooldownHoursRaw = Number(process.env.CLAIM_RETRY_COOLDOWN_HOURS ?? 72);
    const cooldownHours =
      Number.isFinite(cooldownHoursRaw) && cooldownHoursRaw > 0 ? cooldownHoursRaw : 72;

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, status: true, ownerUserId: true, claimStatus: true },
    });
    if (!business || business.status !== 'active') {
      throw new NotFoundException('Business not found');
    }
    if (business.ownerUserId) {
      throw new BadRequestException('Business is already owned');
    }
    if (business.claimStatus === 'claimed') {
      throw new BadRequestException('Business is already claimed');
    }

    const existingPending = await this.prisma.businessClaim.findFirst({
      where: { businessId, status: 'pending' },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (existingPending && existingPending.requesterUserId !== userId) {
      throw new BadRequestException('A claim is already pending for this business');
    }

    let claim = existingPending ?? null;
    if (!claim) {
      const myPendingCount = await this.prisma.businessClaim.count({
        where: { requesterUserId: userId, status: 'pending' },
      });
      if (myPendingCount >= maxPending) {
        throw new BadRequestException('Too many pending claims');
      }

      const lastMine = await this.prisma.businessClaim.findFirst({
        where: { businessId, requesterUserId: userId },
        orderBy: [{ createdAt: 'desc' }],
        select: { status: true, createdAt: true },
      });
      if (lastMine?.status === 'rejected') {
        const cutoff = Date.now() - cooldownHours * 60 * 60 * 1000;
        if (lastMine.createdAt.getTime() > cutoff) {
          throw new BadRequestException('Please wait before re-trying this claim');
        }
      }

      claim = await this.prisma.businessClaim.create({
        data: {
          businessId,
          requesterUserId: userId,
          method: 'docs' as any,
          status: 'pending',
          docsJson: null,
          phoneToVerify: null,
        },
      });

      await this.prisma.business.update({
        where: { id: businessId },
        data: { claimStatus: 'claim_requested' },
      });
    } else {
      if (claim.method !== 'docs') {
        throw new BadRequestException('Pending claim is not a docs claim');
      }
      if (business.claimStatus !== 'claim_requested') {
        await this.prisma.business.update({
          where: { id: businessId },
          data: { claimStatus: 'claim_requested' },
        });
      }
    }

    const docs = this.parseClaimDocs(claim.docsJson);
    if (docs.length >= 5) {
      throw new BadRequestException('Too many documents');
    }

    const doc = {
      id: randomBytes(8).toString('hex'),
      fileName: file.fileName,
      mimeType: file.mimeType,
      storagePath: file.storagePath,
      uploadedAt: new Date().toISOString(),
    };

    const nextDocs = [...docs, doc];
    await this.prisma.businessClaim.update({
      where: { id: claim.id },
      data: {
        docsJson: JSON.stringify(nextDocs),
      },
    });

    return { ok: true as const, claimId: claim.id, docsCount: nextDocs.length, docs: nextDocs };
  }

  async adminGetClaimDocForDownload(claimId: string, docId: string) {
    const claim = await this.prisma.businessClaim.findUnique({
      where: { id: claimId },
      select: { id: true, docsJson: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');

    const docs = this.parseClaimDocs(claim.docsJson);
    const doc = docs.find((d) => d.id === docId);
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async adminGenerateBusinessClaimCode(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        status: true,
        ownerUserId: true,
        claimStatus: true,
      },
    });
    if (!business || business.status !== 'active') {
      throw new NotFoundException('Business not found');
    }
    if (business.ownerUserId || business.claimStatus === 'claimed') {
      throw new BadRequestException('Business is already claimed');
    }

    const code = this.generateInPersonCode();
    const hash = this.hashCode(code);
    const now = new Date();

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        claimCodeHash: hash,
        claimCodeIssuedAt: now,
        claimCodeConsumedAt: null,
      },
    });

    return { ok: true as const, code };
  }

  async listMyBusinessClaims(userId: string) {
    const claims = await this.prisma.businessClaim.findMany({
      where: { requesterUserId: userId },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
      include: {
        business: {
          select: { id: true, name: true, type: true, claimStatus: true, isVerified: true },
        },
      },
    });
    return claims.map((c) => ({
      id: c.id,
      businessId: c.businessId,
      businessName: c.business.name,
      businessType: c.business.type,
      businessClaimStatus: c.business.claimStatus,
      status: c.status,
      method: c.method,
      rejectionReason: c.rejectionReason,
      createdAt: c.createdAt,
      reviewedAt: c.reviewedAt,
    }));
  }

  async adminListBusinessClaims(status?: string) {
    const where =
      status && ['pending', 'approved', 'rejected'].includes(status)
        ? { status: status as BusinessClaimRequestStatus }
        : undefined;
    return this.prisma.businessClaim.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            claimStatus: true,
            isVerified: true,
            ownerUserId: true,
          },
        },
        requester: { select: { id: true, fullName: true, phoneNumber: true } },
        reviewedByAdmin: { select: { id: true, fullName: true, phoneNumber: true } },
      },
    });
  }

  async adminApproveBusinessClaim(adminUserId: string, claimId: string) {
    const claim = await this.prisma.businessClaim.findUnique({
      where: { id: claimId },
      include: {
        business: true,
      },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'pending') {
      throw new BadRequestException('Claim is not pending');
    }

    const updated = await this.prisma.businessClaim.update({
      where: { id: claimId },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedByAdminId: adminUserId,
        rejectionReason: null,
      },
    });

    await this.prisma.business.update({
      where: { id: claim.businessId },
      data: {
        ownerUserId: claim.requesterUserId,
        claimStatus: 'claimed',
        claimedAt: new Date(),
        claimedByUserId: claim.requesterUserId,
        status: claim.business.status === 'pending' ? 'active' : claim.business.status,
      },
    });

    return { ok: true as const, claim: updated };
  }

  async adminRejectBusinessClaim(
    adminUserId: string,
    claimId: string,
    rejectionReason?: string,
  ) {
    const claim = await this.prisma.businessClaim.findUnique({
      where: { id: claimId },
      include: { business: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'pending') {
      throw new BadRequestException('Claim is not pending');
    }

    const updated = await this.prisma.businessClaim.update({
      where: { id: claimId },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedByAdminId: adminUserId,
        rejectionReason: rejectionReason?.trim() ? rejectionReason.trim() : null,
      },
    });

    await this.prisma.business.update({
      where: { id: claim.businessId },
      data: { claimStatus: 'claim_rejected' },
    });

    return { ok: true as const, claim: updated };
  }

  async createUmrahLead(userId: string, dto: CreateUmrahLeadDto) {
    const businessId = dto.businessId.trim();
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, status: true, type: true },
    });
    if (!business || business.status !== 'active' || business.type !== 'umrah') {
      throw new NotFoundException('Business not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, phoneNumber: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const created = await this.prisma.umrahLead.create({
      data: {
        userId,
        businessId,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        message: dto.message?.trim() ? dto.message.trim() : null,
      },
    });

    return { ...created, ok: true as const };
  }

  async ownerListUmrahLeads(userId: string, businessId: string) {
    const business = await this.assertBusinessOwner(userId, businessId);
    if (business.type !== 'umrah') {
      throw new BadRequestException('Only supported for umrah businesses');
    }
    return this.prisma.umrahLead.findMany({
      where: { businessId },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
      include: {
        user: {
          select: { id: true, fullName: true, phoneNumber: true, verificationLevel: true },
        },
      },
    });
  }

  async ownerCreateBusiness(userId: string, dto: CreateBusinessDto) {
    const pendingCount = await this.prisma.business.count({
      where: { ownerUserId: userId, status: 'pending' },
    });
    if (pendingCount >= 3) {
      throw new BadRequestException('Too many pending businesses');
    }

    const now = new Date();
    const trialEndsAt =
      dto.type === 'umrah'
        ? new Date(
            Date.UTC(
              now.getUTCFullYear(),
              now.getUTCMonth() + 6,
              now.getUTCDate(),
              now.getUTCHours(),
              now.getUTCMinutes(),
              now.getUTCSeconds(),
            ),
          )
        : null;

    const created = await this.prisma.business.create({
      data: {
        ownerUserId: userId,
        type: dto.type as any,
        name: dto.name.trim(),
        description: dto.description?.trim() ? dto.description.trim() : null,
        phone: dto.phone?.trim() ? dto.phone.trim() : null,
        whatsapp: dto.whatsapp?.trim() ? dto.whatsapp.trim() : null,
        website: dto.website?.trim() ? dto.website.trim() : null,
        status: 'pending',
        isVerified: false,
        trialEndsAt,
        branches: {
          create: {
            city: dto.branchCity.trim(),
            address: dto.branchAddress.trim(),
            lat: typeof dto.branchLat === 'number' ? dto.branchLat : null,
            lng: typeof dto.branchLng === 'number' ? dto.branchLng : null,
            timeZone: dto.branchTimeZone?.trim() ? dto.branchTimeZone.trim() : null,
            hoursJson: dto.branchHoursJson?.trim()
              ? dto.branchHoursJson.trim()
              : null,
            isActive: true,
          },
        },
      },
      include: {
        branches: true,
      },
    });
    return created;
  }

  async ownerUpdateBusiness(userId: string, businessId: string, dto: UpdateBusinessDto) {
    const business = await this.assertBusinessOwner(userId, businessId);
    if (business.status === 'rejected') {
      throw new BadRequestException('Business is rejected');
    }

    const nextStatus =
      business.status === 'active' ? ('pending' as const) : business.status;

    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        name: dto.name?.trim() ? dto.name.trim() : undefined,
        description:
          dto.description !== undefined
            ? dto.description.trim() || null
            : undefined,
        phone: dto.phone !== undefined ? dto.phone.trim() || null : undefined,
        whatsapp:
          dto.whatsapp !== undefined ? dto.whatsapp.trim() || null : undefined,
        website:
          dto.website !== undefined ? dto.website.trim() || null : undefined,
        status: nextStatus,
        isVerified: nextStatus === 'pending' ? false : undefined,
      },
    });
  }

  async ownerCreateBranch(userId: string, businessId: string, dto: CreateBranchDto) {
    const business = await this.assertBusinessOwner(userId, businessId);
    if (business.status === 'rejected') {
      throw new BadRequestException('Business is rejected');
    }
    return this.prisma.businessBranch.create({
      data: {
        businessId,
        city: dto.city.trim(),
        address: dto.address.trim(),
        lat: typeof dto.lat === 'number' ? dto.lat : null,
        lng: typeof dto.lng === 'number' ? dto.lng : null,
        timeZone: dto.timeZone?.trim() ? dto.timeZone.trim() : null,
        hoursJson: dto.hoursJson?.trim() ? dto.hoursJson.trim() : null,
        isActive: true,
      },
    });
  }

  async ownerUpdateBranch(userId: string, branchId: string, dto: UpdateBranchDto) {
    const branch = await this.assertBranchOwner(userId, branchId);
    if (branch.business.status === 'rejected') {
      throw new BadRequestException('Business is rejected');
    }
    return this.prisma.businessBranch.update({
      where: { id: branchId },
      data: {
        city: dto.city?.trim() ? dto.city.trim() : undefined,
        address: dto.address?.trim() ? dto.address.trim() : undefined,
        lat: dto.lat === undefined ? undefined : dto.lat,
        lng: dto.lng === undefined ? undefined : dto.lng,
        timeZone:
          dto.timeZone === undefined ? undefined : dto.timeZone.trim() || null,
        hoursJson:
          dto.hoursJson === undefined ? undefined : dto.hoursJson.trim() || null,
        isActive: dto.isActive === undefined ? undefined : dto.isActive,
      },
    });
  }

  async ownerCreateOffer(userId: string, branchId: string, dto: CreateOfferDto) {
    const branch = await this.assertBranchOwner(userId, branchId);
    if (branch.business.type !== 'exchange') {
      throw new BadRequestException('Offers are only supported for exchange businesses');
    }
    if (branch.business.status !== 'active') {
      throw new BadRequestException('Business must be approved before publishing offers');
    }

    const rate = this.parseDecimalString(dto.rate, 'rate');
    if (!rate) throw new BadRequestException('rate is required');
    const minAmount = this.parseDecimalString(dto.minAmount, 'minAmount');
    const maxAmount = this.parseDecimalString(dto.maxAmount, 'maxAmount');
    if (minAmount && maxAmount && Number(minAmount) > Number(maxAmount)) {
      throw new BadRequestException('minAmount must be <= maxAmount');
    }

    return this.prisma.exchangeOffer.upsert({
      where: {
        branchId_fromCurrency_toCurrency_direction: {
          branchId,
          fromCurrency: dto.fromCurrency.trim().toUpperCase(),
          toCurrency: dto.toCurrency.trim().toUpperCase(),
          direction: dto.direction as any,
        },
      },
      update: {
        rate,
        minAmount: minAmount ?? null,
        maxAmount: maxAmount ?? null,
        feeNote: dto.feeNote?.trim() ? dto.feeNote.trim() : null,
      },
      create: {
        branchId,
        fromCurrency: dto.fromCurrency.trim().toUpperCase(),
        toCurrency: dto.toCurrency.trim().toUpperCase(),
        direction: dto.direction as any,
        rate,
        minAmount: minAmount ?? null,
        maxAmount: maxAmount ?? null,
        feeNote: dto.feeNote?.trim() ? dto.feeNote.trim() : null,
      },
    });
  }

  async ownerUpdateOffer(userId: string, offerId: string, dto: UpdateOfferDto) {
    const offer = await this.assertOfferOwner(userId, offerId);
    if (offer.branch.business.status !== 'active') {
      throw new BadRequestException('Business must be approved before updating offers');
    }

    const rate =
      dto.rate === undefined
        ? undefined
        : this.parseDecimalString(dto.rate, 'rate') ?? undefined;
    const minAmount =
      dto.minAmount === undefined
        ? undefined
        : this.parseDecimalString(dto.minAmount, 'minAmount');
    const maxAmount =
      dto.maxAmount === undefined
        ? undefined
        : this.parseDecimalString(dto.maxAmount, 'maxAmount');
    if (typeof minAmount === 'string' && typeof maxAmount === 'string') {
      if (Number(minAmount) > Number(maxAmount)) {
        throw new BadRequestException('minAmount must be <= maxAmount');
      }
    }

    return this.prisma.exchangeOffer.update({
      where: { id: offerId },
      data: {
        rate,
        minAmount: minAmount === undefined ? undefined : minAmount ?? null,
        maxAmount: maxAmount === undefined ? undefined : maxAmount ?? null,
        feeNote: dto.feeNote === undefined ? undefined : dto.feeNote.trim() || null,
        direction: dto.direction as any,
      },
    });
  }

  async ownerDeleteOffer(userId: string, offerId: string) {
    await this.assertOfferOwner(userId, offerId);
    await this.prisma.exchangeOffer.delete({ where: { id: offerId } });
    return { ok: true as const };
  }

  async ownerListLeads(userId: string, businessId: string) {
    await this.assertBusinessOwner(userId, businessId);
    return this.prisma.exchangeLead.findMany({
      where: {
        branch: {
          businessId,
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            verificationLevel: true,
          },
        },
        branch: {
          select: {
            id: true,
            city: true,
            address: true,
          },
        },
      },
    });
  }

  async ownerConfirmExchangeConfirmation(userId: string, confirmationId: string) {
    const confirmation = await this.prisma.exchangeConfirmation.findUnique({
      where: { id: confirmationId },
      include: { branch: { include: { business: true } } },
    });
    if (!confirmation) throw new NotFoundException('Confirmation not found');
    if (confirmation.branch.business.ownerUserId !== userId) {
      throw new ForbiddenException();
    }
    return this.prisma.exchangeConfirmation.update({
      where: { id: confirmationId },
      data: {
        status: 'business_confirmed',
      },
    });
  }

  async adminListReviews(businessId?: string, isHidden?: string) {
    const hidden =
      isHidden === '1' || isHidden === 'true'
        ? true
        : isHidden === '0' || isHidden === 'false'
          ? false
          : undefined;
    return this.prisma.businessReview.findMany({
      where: {
        ...(businessId ? { businessId } : undefined),
        ...(hidden === undefined ? undefined : { isHidden: hidden }),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
      include: {
        user: { select: { id: true, fullName: true, phoneNumber: true } },
        business: { select: { id: true, name: true, status: true, isVerified: true } },
        branch: { select: { id: true, city: true, address: true } },
      },
    });
  }

  async adminSetReviewHidden(id: string, isHidden: boolean) {
    const existing = await this.prisma.businessReview.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Review not found');
    return this.prisma.businessReview.update({
      where: { id },
      data: { isHidden },
    });
  }

  async listExchangeFavorites(userId: string) {
    const favorites = await this.prisma.exchangeFavorite.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
      include: {
        business: {
          include: {
            branches: {
              where: { isActive: true },
              take: 1,
              orderBy: [{ createdAt: 'asc' }],
            },
          },
        },
      },
    });
    return favorites
      .filter((f) => f.business.status === 'active' && f.business.type === 'exchange')
      .map((f) => {
        const branch = f.business.branches[0] ?? null;
        return {
          id: f.business.id,
          name: f.business.name,
          isVerified: f.business.isVerified,
          status: f.business.status,
          city: branch?.city ?? '',
          address: branch?.address ?? '',
          favoritedAt: f.createdAt,
        };
      });
  }

  async addExchangeFavorite(userId: string, businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, status: true, type: true },
    });
    if (!business || business.status !== 'active' || business.type !== 'exchange') {
      throw new NotFoundException('Business not found');
    }
    await this.prisma.exchangeFavorite.upsert({
      where: { userId_businessId: { userId, businessId } },
      update: {},
      create: { userId, businessId },
    });
    return { ok: true as const, favorited: true as const };
  }

  async removeExchangeFavorite(userId: string, businessId: string) {
    await this.prisma.exchangeFavorite.deleteMany({
      where: { userId, businessId },
    });
    return { ok: true as const, favorited: false as const };
  }

  async listExchangeRateAlerts(userId: string) {
    const alerts = await this.prisma.exchangeRateAlert.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
    return alerts.map((a) => ({
      id: a.id,
      fromCurrency: a.fromCurrency,
      toCurrency: a.toCurrency,
      direction: a.direction,
      targetRate: a.targetRate.toString(),
      isActive: a.isActive,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      lastTriggeredAt: a.lastTriggeredAt,
    }));
  }

  async createExchangeRateAlert(userId: string, dto: CreateExchangeRateAlertDto) {
    const targetRate = this.parseDecimalString(dto.targetRate, 'targetRate');
    if (!targetRate) throw new BadRequestException('targetRate is required');

    const isActive =
      dto.isActive === undefined
        ? true
        : dto.isActive === '1' || dto.isActive === 'true';

    const fromCurrency = dto.fromCurrency.trim().toUpperCase();
    const toCurrency = dto.toCurrency.trim().toUpperCase();

    const created = await this.prisma.exchangeRateAlert.upsert({
      where: {
        userId_fromCurrency_toCurrency_direction_targetRate: {
          userId,
          fromCurrency,
          toCurrency,
          direction: dto.direction as any,
          targetRate,
        },
      },
      update: { isActive },
      create: {
        userId,
        fromCurrency,
        toCurrency,
        direction: dto.direction as any,
        targetRate,
        isActive,
      },
    });

    return {
      id: created.id,
      fromCurrency: created.fromCurrency,
      toCurrency: created.toCurrency,
      direction: created.direction,
      targetRate: created.targetRate.toString(),
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      lastTriggeredAt: created.lastTriggeredAt,
    };
  }

  async deleteExchangeRateAlert(userId: string, id: string) {
    const result = await this.prisma.exchangeRateAlert.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) throw new NotFoundException('Alert not found');
    return { ok: true as const };
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

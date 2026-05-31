import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessStatus, BusinessType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { CreateBusinessDto } from './dto/create-business.dto';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';
import { CreateExchangeConfirmationDto } from './dto/create-exchange-confirmation.dto';
import { CreateExchangeLeadDto } from './dto/create-exchange-lead.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
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

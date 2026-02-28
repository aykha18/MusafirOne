import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrustService } from '../trust/trust.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCurrencyPostDto } from './dto/create-currency-post.dto';
import { UpdateCurrencyPostDto } from './dto/update-currency-post.dto';
import { ListCurrencyPostsDto } from './dto/list-currency-posts.dto';
import { CreateMatchRequestDto } from './dto/create-match-request.dto';

@Injectable()
export class CurrencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trustService: TrustService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createPost(userId: string, dto: CreateCurrencyPostDto) {
    const expiry = new Date(dto.expiryDate);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      throw new BadRequestException('Expiry date must be in the future');
    }
    const post = await this.prisma.currencyPost.create({
      data: {
        userId,
        haveCurrency: dto.haveCurrency,
        needCurrency: dto.needCurrency,
        amount: dto.amount,
        preferredRate: dto.preferredRate,
        city: dto.city,
        expiryDate: expiry,
        status: 'draft',
      },
    });
    return post;
  }

  async listPosts(query: ListCurrencyPostsDto) {
    await this.expireOldPosts();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = {
      status: 'active',
      expiryDate: {
        gt: new Date(),
      },
    };
    if (query.haveCurrency) {
      where.haveCurrency = query.haveCurrency;
    }
    if (query.needCurrency) {
      where.needCurrency = query.needCurrency;
    }
    if (query.city) {
      where.city = query.city;
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.currencyPost.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.currencyPost.count({
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

  async getPost(id: string) {
    await this.expireOldPosts();
    const post = await this.prisma.currencyPost.findUnique({
      where: {
        id,
      },
    });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async updatePost(userId: string, id: string, dto: UpdateCurrencyPostDto) {
    const post = await this.prisma.currencyPost.findUnique({
      where: {
        id,
      },
    });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException();
    }
    if (post.status !== 'draft' && post.status !== 'active') {
      throw new BadRequestException('Cannot modify post in current status');
    }
    let expiryDate = post.expiryDate;
    if (dto.expiryDate) {
      const next = new Date(dto.expiryDate);
      if (Number.isNaN(next.getTime()) || next <= new Date()) {
        throw new BadRequestException('Expiry date must be in the future');
      }
      expiryDate = next;
    }
    const updated = await this.prisma.currencyPost.update({
      where: {
        id,
      },
      data: {
        haveCurrency: dto.haveCurrency ?? undefined,
        needCurrency: dto.needCurrency ?? undefined,
        amount: dto.amount ?? undefined,
        preferredRate: dto.preferredRate ?? undefined,
        city: dto.city ?? undefined,
        expiryDate,
      },
    });
    return updated;
  }

  async activatePost(userId: string, id: string) {
    const post = await this.prisma.currencyPost.findUnique({
      where: {
        id,
      },
    });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException();
    }
    if (post.status !== 'draft') {
      throw new BadRequestException('Only draft posts can be activated');
    }
    const activeCount = await this.prisma.currencyPost.count({
      where: {
        userId,
        status: 'active',
      },
    });
    if (activeCount >= 10) {
      throw new BadRequestException('Maximum active posts reached');
    }
    const updated = await this.prisma.currencyPost.update({
      where: {
        id,
      },
      data: {
        status: 'active',
      },
    });
    await this.logStateChange(
      'CurrencyPost',
      id,
      post.status,
      updated.status,
      userId,
      'activate',
    );
    return updated;
  }

  async cancelPost(userId: string, id: string) {
    const post = await this.prisma.currencyPost.findUnique({
      where: {
        id,
      },
      include: {
        matchRequests: {
          where: {
            status: {
              in: ['pending', 'accepted'],
            },
          },
        },
      },
    });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException();
    }
    if (post.status !== 'draft' && post.status !== 'active') {
      throw new BadRequestException(
        'Only draft or active posts can be cancelled',
      );
    }

    // Handle associated match requests
    if (post.matchRequests.length > 0) {
      const requestIds = post.matchRequests.map((r) => r.id);
      
      // Notify requesters
      for (const req of post.matchRequests) {
        await this.notificationsService.sendPushNotification(
          req.requesterId,
          'Currency Post Cancelled',
          'The currency post you requested has been cancelled.',
          { requestId: req.id, postId: id, type: 'currency_post_cancelled' },
        );
      }

      // Cancel requests
      await this.prisma.currencyMatchRequest.updateMany({
        where: {
          id: {
            in: requestIds,
          },
        },
        data: {
          status: 'cancelled',
        },
      });
    }

    const updated = await this.prisma.currencyPost.update({
      where: {
        id,
      },
      data: {
        status: 'cancelled',
      },
    });
    await this.logStateChange(
      'CurrencyPost',
      id,
      post.status,
      updated.status,
      userId,
      'cancel',
    );
    return updated;
  }

  async createMatchRequest(
    userId: string,
    postId: string,
    dto: CreateMatchRequestDto,
  ) {
    const post = await this.prisma.currencyPost.findUnique({
      where: {
        id: postId,
      },
    });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }
    if (post.userId === userId) {
      throw new BadRequestException('Cannot request match on own post');
    }
    if (post.status !== 'active' || post.expiryDate <= new Date()) {
      throw new BadRequestException('Post is not available for matching');
    }
    const existing = await this.prisma.currencyMatchRequest.findFirst({
      where: {
        currencyPostId: postId,
        requesterId: userId,
      },
    });
    if (existing) {
      throw new BadRequestException('Match request already exists');
    }
    const created = await this.prisma.currencyMatchRequest.create({
      data: {
        currencyPostId: postId,
        requesterId: userId,
        targetUserId: post.userId,
        status: 'pending',
      },
    });
    await this.logStateChange(
      'CurrencyMatchRequest',
      created.id,
      null,
      created.status,
      userId,
      dto.message ?? undefined,
    );

    // Notify post owner
    await this.notificationsService.sendPushNotification(
      post.userId,
      'New Currency Match Request',
      'Someone wants to match with your currency post',
      { requestId: created.id, type: 'currency_match_request' },
    );

    return created;
  }

  async listMatchRequests(userId: string, role?: 'sent' | 'received' | 'all') {
    const where: Record<string, unknown> = {};
    if (role === 'sent') {
      where.requesterId = userId;
    } else if (role === 'received') {
      where.targetUserId = userId;
    } else {
      where.OR = [{ requesterId: userId }, { targetUserId: userId }];
    }
    const items = await this.prisma.currencyMatchRequest.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
    return items;
  }

  async acceptMatchRequest(userId: string, requestId: string) {
    const request = await this.prisma.currencyMatchRequest.findUnique({
      where: {
        id: requestId,
      },
    });
    if (!request || request.deletedAt) {
      throw new NotFoundException('Match request not found');
    }
    if (request.targetUserId !== userId) {
      throw new ForbiddenException();
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be accepted');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.currencyMatchRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: 'accepted',
        },
      });
      await tx.currencyPost.update({
        where: {
          id: request.currencyPostId,
        },
        data: {
          status: 'matched',
        },
      });
      await tx.currencyMatchRequest.updateMany({
        where: {
          currencyPostId: request.currencyPostId,
          id: {
            not: requestId,
          },
          status: 'pending',
        },
        data: {
          status: 'cancelled',
        },
      });
      return updatedRequest;
    });
    await this.logStateChange(
      'CurrencyMatchRequest',
      requestId,
      request.status,
      'accepted',
      userId,
      'accept',
    );

    // Notify requester
    await this.notificationsService.sendPushNotification(
      request.requesterId,
      'Currency Match Accepted',
      'Your currency match request has been accepted!',
      { requestId, type: 'currency_match_accepted' },
    );

    return result;
  }

  async rejectMatchRequest(userId: string, requestId: string) {
    const request = await this.prisma.currencyMatchRequest.findUnique({
      where: {
        id: requestId,
      },
    });
    if (!request || request.deletedAt) {
      throw new NotFoundException('Match request not found');
    }
    if (request.targetUserId !== userId) {
      throw new ForbiddenException();
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be rejected');
    }
    const updated = await this.prisma.currencyMatchRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: 'rejected',
      },
    });
    await this.logStateChange(
      'CurrencyMatchRequest',
      requestId,
      request.status,
      updated.status,
      userId,
      'reject',
    );

    // Notify requester
    await this.notificationsService.sendPushNotification(
      request.requesterId,
      'Currency Match Rejected',
      'Your currency match request has been rejected.',
      { requestId, type: 'currency_match_rejected' },
    );

    return updated;
  }

  async cancelMatchRequest(userId: string, requestId: string) {
    const request = await this.prisma.currencyMatchRequest.findUnique({
      where: {
        id: requestId,
      },
      include: {
        currencyPost: true,
      },
    });
    if (!request || request.deletedAt) {
      throw new NotFoundException('Match request not found');
    }
    if (request.requesterId !== userId) {
      throw new ForbiddenException();
    }
    if (request.status === 'completed' || request.status === 'rejected') {
      throw new BadRequestException('Cannot cancel completed or rejected requests');
    }

    // Notify post owner
    if (request.currencyPost && (request.status === 'pending' || request.status === 'accepted')) {
      await this.notificationsService.sendPushNotification(
        request.currencyPost.userId,
        'Currency Request Cancelled',
        'A currency match request has been cancelled by the requester.',
        { requestId: requestId, postId: request.currencyPostId, type: 'currency_request_cancelled' },
      );
    }

    const updated = await this.prisma.currencyMatchRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: 'cancelled',
      },
    });
    await this.logStateChange(
      'CurrencyMatchRequest',
      requestId,
      request.status,
      updated.status,
      userId,
      'cancel',
    );
    return updated;
  }

  async completeMatchRequest(userId: string, requestId: string) {
    const request = await this.prisma.currencyMatchRequest.findUnique({
      where: {
        id: requestId,
      },
    });
    if (!request || request.deletedAt) {
      throw new NotFoundException('Match request not found');
    }
    if (request.requesterId !== userId && request.targetUserId !== userId) {
      throw new ForbiddenException();
    }
    if (request.status !== 'accepted') {
      throw new BadRequestException('Only accepted requests can be completed');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.currencyMatchRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: 'completed',
        },
      });
      await tx.currencyPost.update({
        where: {
          id: request.currencyPostId,
        },
        data: {
          status: 'completed',
        },
      });
      return updatedRequest;
    });
    await this.logStateChange(
      'CurrencyMatchRequest',
      requestId,
      request.status,
      'completed',
      userId,
      'complete',
    );

    // Trigger Trust Score update for both parties
    await this.trustService.recalculateForUser(request.requesterId);
    await this.trustService.recalculateForUser(request.targetUserId);

    return result;
  }

  private async expireOldPosts() {
    await this.prisma.currencyPost.updateMany({
      where: {
        status: 'active',
        expiryDate: {
          lte: new Date(),
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
    fromState: string | null,
    toState: string,
    userId: string,
    reason?: string,
  ) {
    await this.prisma.stateChangeLog.create({
      data: {
        entityType,
        entityId,
        fromState: fromState ?? undefined,
        toState,
        changedByUserId: userId,
        reason,
      },
    });
  }
}

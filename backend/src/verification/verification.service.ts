import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  VerificationDocumentStatus,
  VerificationDocumentType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrustService } from '../trust/trust.service';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trustService: TrustService,
  ) {}

  async submitDocument(params: {
    userId: string;
    type: VerificationDocumentType;
    fileName: string;
    mimeType: string;
    storagePath: string;
  }) {
    const doc = await this.prisma.verificationDocument.create({
      data: {
        userId: params.userId,
        type: params.type,
        status: VerificationDocumentStatus.submitted,
        fileName: params.fileName,
        mimeType: params.mimeType,
        storagePath: params.storagePath,
      },
    });
    return doc;
  }

  listMyDocuments(userId: string) {
    return this.prisma.verificationDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll(params?: { status?: VerificationDocumentStatus; userId?: string }) {
    const where: Prisma.VerificationDocumentWhereInput = {};
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.userId) {
      where.userId = params.userId;
    }
    return this.prisma.verificationDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: true, reviewedByAdmin: true },
    });
  }

  async reviewDocument(params: {
    adminUserId: string;
    id: string;
    status: VerificationDocumentStatus;
    rejectionReason?: string;
  }) {
    if (
      params.status !== VerificationDocumentStatus.under_review &&
      params.status !== VerificationDocumentStatus.approved &&
      params.status !== VerificationDocumentStatus.rejected
    ) {
      throw new BadRequestException('Invalid status');
    }
    if (
      params.status !== VerificationDocumentStatus.rejected &&
      params.rejectionReason
    ) {
      throw new BadRequestException(
        'rejectionReason is only allowed when status is rejected',
      );
    }
    if (
      params.status === VerificationDocumentStatus.rejected &&
      !params.rejectionReason
    ) {
      throw new BadRequestException(
        'rejectionReason is required when status is rejected',
      );
    }

    const existing = await this.prisma.verificationDocument.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      throw new NotFoundException('Document not found');
    }

    const updated = await this.prisma.verificationDocument.update({
      where: { id: params.id },
      data: {
        status: params.status,
        rejectionReason:
          params.status === VerificationDocumentStatus.rejected
            ? params.rejectionReason
            : null,
        reviewedByAdminId: params.adminUserId,
        reviewedAt:
          params.status === VerificationDocumentStatus.approved ||
          params.status === VerificationDocumentStatus.rejected
            ? new Date()
            : null,
      },
    });

    if (params.status === VerificationDocumentStatus.approved) {
      await this.prisma.user.update({
        where: { id: updated.userId },
        data: { verificationLevel: 2 },
      });
      await this.trustService.recalculateForUser(updated.userId);
      return updated;
    }

    if (params.status === VerificationDocumentStatus.rejected) {
      const [user, approvedCount] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: updated.userId } }),
        this.prisma.verificationDocument.count({
          where: {
            userId: updated.userId,
            status: VerificationDocumentStatus.approved,
          },
        }),
      ]);
      if (user && user.verificationLevel === 2 && approvedCount === 0) {
        const fallbackLevel = user.verificationLevel >= 1 ? 1 : 0;
        await this.prisma.user.update({
          where: { id: updated.userId },
          data: { verificationLevel: fallbackLevel },
        });
      }
      await this.trustService.recalculateForUser(updated.userId);
    }

    return updated;
  }

  async getByIdForAdmin(id: string) {
    const doc = await this.prisma.verificationDocument.findUnique({
      where: { id },
      include: { user: true, reviewedByAdmin: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return doc;
  }
}

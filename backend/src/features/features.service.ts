import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeatureIdeaDto } from './dto/create-feature-idea.dto';

@Injectable()
export class FeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  private slugifyTitle(title: string) {
    const cleaned = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return cleaned.slice(0, 50) || 'feature';
  }

  async listForUser(userId: string) {
    const features = await this.prisma.featureIdea.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: 'asc' }],
      include: { _count: { select: { votes: true } } },
    });

    const featureIds = features.map((f) => f.id);
    const votes = await this.prisma.featureVote.findMany({
      where: { userId, featureId: { in: featureIds } },
      select: { featureId: true },
    });
    const votedSet = new Set(votes.map((v) => v.featureId));

    return features
      .map((f) => ({
        id: f.id,
        slug: f.slug,
        title: f.title,
        shortDescription: f.shortDescription,
        longDescription: f.longDescription,
        voteCount: f._count.votes,
        voted: votedSet.has(f.id),
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      }))
      .sort((a, b) => b.voteCount - a.voteCount);
  }

  async submitIdea(userId: string, dto: CreateFeatureIdeaDto) {
    const title = dto.title.trim();
    const shortDescription = dto.shortDescription.trim();
    const longDescription =
      dto.longDescription?.trim() ||
      `${shortDescription}\n\nSubmitted by the community.`;

    const baseSlug = this.slugifyTitle(title);
    const existing = await this.prisma.featureIdea.findUnique({
      where: { slug: baseSlug },
      select: { id: true },
    });
    const slug = existing
      ? `${baseSlug}-${randomBytes(2).toString('hex')}`
      : baseSlug;

    const dupe = await this.prisma.featureIdea.findFirst({
      where: {
        OR: [
          { slug },
          {
            title: {
              equals: title,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: { id: true },
    });
    if (dupe) {
      throw new BadRequestException('A similar feature idea already exists');
    }

    const created = await this.prisma.featureIdea.create({
      data: {
        slug,
        title,
        shortDescription,
        longDescription,
        isActive: false,
        submittedByUserId: userId,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        longDescription: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...created,
      voteCount: 0,
      voted: false,
      status: 'pending',
    };
  }

  async getBySlugForUser(userId: string, slug: string) {
    const feature = await this.prisma.featureIdea.findUnique({
      where: { slug },
      include: { _count: { select: { votes: true } } },
    });

    if (!feature || !feature.isActive) {
      throw new NotFoundException('Feature not found');
    }

    const vote = await this.prisma.featureVote.findUnique({
      where: {
        featureId_userId: {
          featureId: feature.id,
          userId,
        },
      },
    });

    return {
      id: feature.id,
      slug: feature.slug,
      title: feature.title,
      shortDescription: feature.shortDescription,
      longDescription: feature.longDescription,
      voteCount: feature._count.votes,
      voted: Boolean(vote),
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt,
    };
  }

  async toggleVote(userId: string, slug: string) {
    const feature = await this.prisma.featureIdea.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });

    if (!feature || !feature.isActive) {
      throw new NotFoundException('Feature not found');
    }

    const existing = await this.prisma.featureVote.findUnique({
      where: {
        featureId_userId: {
          featureId: feature.id,
          userId,
        },
      },
    });

    if (existing) {
      await this.prisma.featureVote.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.featureVote.create({
        data: { featureId: feature.id, userId },
      });
    }

    const voteCount = await this.prisma.featureVote.count({
      where: { featureId: feature.id },
    });

    return {
      voted: !existing,
      voteCount,
    };
  }

  async listPending() {
    const ideas = await this.prisma.featureIdea.findMany({
      where: { isActive: false, submittedByUserId: { not: null } },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        longDescription: true,
        submittedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return ideas.map((i) => ({ ...i, status: 'pending' }));
  }

  async approve(id: string) {
    const idea = await this.prisma.featureIdea.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!idea) {
      throw new NotFoundException('Feature idea not found');
    }
    if (idea.isActive) {
      throw new BadRequestException('Feature idea is already active');
    }
    return this.prisma.featureIdea.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        longDescription: true,
        submittedByUserId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

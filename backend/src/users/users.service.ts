import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getById(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: {
        id,
      },
    });
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
        verificationLevel: dto.verificationLevel ?? undefined,
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
    return this.prisma.user.update({
      where: { id },
      data: { verificationLevel: level },
    });
  }
}

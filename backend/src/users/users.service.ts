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
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListLogsDto } from './dto/list-logs.dto';

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listLogs(query: ListLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.userId) {
      where.changedByUserId = query.userId;
    }

    const [items, total] = await Promise.all([
      this.prisma.stateChangeLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          changedByUser: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            },
          },
        },
      }),
      this.prisma.stateChangeLog.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}

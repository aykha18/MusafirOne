import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { LogsService } from './logs.service';
import { ListLogsDto } from './dto/list-logs.dto';

@Controller('admin/logs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async findAll(@Query() query: ListLogsDto) {
    return this.logsService.listLogs(query);
  }
}

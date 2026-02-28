import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputesService } from './disputes.service';

type AuthenticatedRequest = {
  user: {
    id: string;
    phoneNumber: string;
    isAdmin?: boolean;
  };
};

@UseGuards(AuthGuard('jwt'))
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDisputeDto) {
    return this.disputesService.create(req.user.id, dto);
  }

  @Get('me')
  listForUser(@Req() req: AuthenticatedRequest) {
    return this.disputesService.listForUser(req.user.id);
  }

  @UseGuards(AdminGuard)
  @Get()
  listAll() {
    return this.disputesService.listAll();
  }

  @UseGuards(AdminGuard)
  @Post(':id/resolve')
  resolve(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolve(req.user.id, id, dto);
  }
}

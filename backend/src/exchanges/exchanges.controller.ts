import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';
import { CreateExchangeConfirmationDto } from './dto/create-exchange-confirmation.dto';
import { CreateExchangeLeadDto } from './dto/create-exchange-lead.dto';
import { ListExchangesDto } from './dto/list-exchanges.dto';
import { VerifyBusinessDto } from './dto/verify-business.dto';
import { ExchangesService } from './exchanges.service';

type AuthenticatedRequest = {
  user: {
    id: string;
    phoneNumber: string;
    isAdmin?: boolean;
  };
};

@UseGuards(AuthGuard('jwt'))
@Controller('exchanges')
export class ExchangesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Get()
  list(@Query() query: ListExchangesDto) {
    return this.exchangesService.listExchanges(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.exchangesService.getExchange(id);
  }

  @Get(':id/offers')
  listOffers(@Param('id') id: string, @Query('branchId') branchId?: string) {
    return this.exchangesService.listOffers(id, branchId);
  }

  @Post(':branchId/leads')
  createLead(
    @Req() req: AuthenticatedRequest,
    @Param('branchId') branchId: string,
    @Body() dto: CreateExchangeLeadDto,
  ) {
    return this.exchangesService.createLead(req.user.id, branchId, dto);
  }

  @Post(':branchId/confirmations')
  createConfirmation(
    @Req() req: AuthenticatedRequest,
    @Param('branchId') branchId: string,
    @Body() dto: CreateExchangeConfirmationDto,
  ) {
    return this.exchangesService.createConfirmation(req.user.id, branchId, dto);
  }

  @Post(':businessId/reviews')
  createReview(
    @Req() req: AuthenticatedRequest,
    @Param('businessId') businessId: string,
    @Body() dto: CreateBusinessReviewDto,
  ) {
    return this.exchangesService.createReview(req.user.id, businessId, dto);
  }
}

@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/businesses')
export class AdminBusinessesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Get()
  list(@Query('status') status?: string, @Query('type') type?: string) {
    return this.exchangesService.adminListBusinesses(status, type);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.exchangesService.adminSetBusinessStatus(id, 'active');
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.exchangesService.adminSetBusinessStatus(id, 'rejected');
  }

  @Patch(':id/verify')
  verify(@Param('id') id: string, @Body() dto: VerifyBusinessDto) {
    return this.exchangesService.adminVerifyBusiness(id, dto.isVerified);
  }
}

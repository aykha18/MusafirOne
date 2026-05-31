import {
  Body,
  Controller,
  Delete,
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
import { SetReviewHiddenDto } from './dto/set-review-hidden.dto';
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

@UseGuards(AuthGuard('jwt'))
@Controller()
export class BusinessesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Get('businesses/mine')
  listMine(@Req() req: AuthenticatedRequest) {
    return this.exchangesService.ownerListMyBusinesses(req.user.id);
  }

  @Post('businesses')
  createBusiness(@Req() req: AuthenticatedRequest, @Body() dto: CreateBusinessDto) {
    return this.exchangesService.ownerCreateBusiness(req.user.id, dto);
  }

  @Patch('businesses/:id')
  updateBusiness(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.exchangesService.ownerUpdateBusiness(req.user.id, id, dto);
  }

  @Post('businesses/:id/branches')
  createBranch(
    @Req() req: AuthenticatedRequest,
    @Param('id') businessId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.exchangesService.ownerCreateBranch(req.user.id, businessId, dto);
  }

  @Patch('branches/:id')
  updateBranch(
    @Req() req: AuthenticatedRequest,
    @Param('id') branchId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.exchangesService.ownerUpdateBranch(req.user.id, branchId, dto);
  }

  @Post('branches/:id/offers')
  createOffer(
    @Req() req: AuthenticatedRequest,
    @Param('id') branchId: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.exchangesService.ownerCreateOffer(req.user.id, branchId, dto);
  }

  @Patch('offers/:id')
  updateOffer(
    @Req() req: AuthenticatedRequest,
    @Param('id') offerId: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.exchangesService.ownerUpdateOffer(req.user.id, offerId, dto);
  }

  @Delete('offers/:id')
  deleteOffer(@Req() req: AuthenticatedRequest, @Param('id') offerId: string) {
    return this.exchangesService.ownerDeleteOffer(req.user.id, offerId);
  }

  @Get('businesses/:id/leads')
  listLeads(@Req() req: AuthenticatedRequest, @Param('id') businessId: string) {
    return this.exchangesService.ownerListLeads(req.user.id, businessId);
  }

  @Post('confirmations/:id/confirm')
  confirmExchange(
    @Req() req: AuthenticatedRequest,
    @Param('id') confirmationId: string,
  ) {
    return this.exchangesService.ownerConfirmExchangeConfirmation(
      req.user.id,
      confirmationId,
    );
  }
}

@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Get()
  list(
    @Query('businessId') businessId?: string,
    @Query('isHidden') isHidden?: string,
  ) {
    return this.exchangesService.adminListReviews(businessId, isHidden);
  }

  @Patch(':id/hide')
  hide(@Param('id') id: string, @Body() dto: SetReviewHiddenDto) {
    return this.exchangesService.adminSetReviewHidden(id, dto.isHidden);
  }
}

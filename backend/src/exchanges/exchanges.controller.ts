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
import { CreateBusinessClaimDto } from './dto/create-business-claim.dto';
import { CreateBusinessDto } from './dto/create-business.dto';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';
import { CreateExchangeConfirmationDto } from './dto/create-exchange-confirmation.dto';
import { CreateExchangeLeadDto } from './dto/create-exchange-lead.dto';
import { CreateExchangeRateAlertDto } from './dto/create-exchange-rate-alert.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateUmrahLeadDto } from './dto/create-umrah-lead.dto';
import { ListDirectoryBusinessesDto } from './dto/list-directory-businesses.dto';
import { ListAdminClaimsDto } from './dto/list-admin-claims.dto';
import { ListExchangesDto } from './dto/list-exchanges.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { SetReviewHiddenDto } from './dto/set-review-hidden.dto';
import { VerifyBusinessDto } from './dto/verify-business.dto';
import { VerifyBusinessClaimCodeDto } from './dto/verify-business-claim-code.dto';
import { VerifyBusinessClaimOtpDto } from './dto/verify-business-claim-otp.dto';
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

@UseGuards(AuthGuard('jwt'))
@Controller('directory')
export class DirectoryController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Get('businesses')
  list(@Query() query: ListDirectoryBusinessesDto) {
    return this.exchangesService.listDirectoryBusinesses(query);
  }

  @Get('businesses/:id')
  getOne(@Param('id') id: string) {
    return this.exchangesService.getDirectoryBusiness(id);
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

  @Post(':id/claim-code')
  generateClaimCode(@Param('id') id: string) {
    return this.exchangesService.adminGenerateBusinessClaimCode(id);
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

  @Post('businesses/:id/claim')
  createClaim(
    @Req() req: AuthenticatedRequest,
    @Param('id') businessId: string,
    @Body() dto: CreateBusinessClaimDto,
  ) {
    return this.exchangesService.createBusinessClaim(req.user.id, businessId, dto);
  }

  @Post('businesses/:id/claim/verify-otp')
  verifyClaimOtp(
    @Req() req: AuthenticatedRequest,
    @Param('id') businessId: string,
    @Body() dto: VerifyBusinessClaimOtpDto,
  ) {
    return this.exchangesService.verifyBusinessClaimOtp(req.user.id, businessId, dto.code);
  }

  @Post('businesses/:id/claim/resend-otp')
  resendClaimOtp(@Req() req: AuthenticatedRequest, @Param('id') businessId: string) {
    return this.exchangesService.resendBusinessClaimOtp(req.user.id, businessId);
  }

  @Post('businesses/:id/claim/verify-code')
  verifyClaimCode(
    @Req() req: AuthenticatedRequest,
    @Param('id') businessId: string,
    @Body() dto: VerifyBusinessClaimCodeDto,
  ) {
    return this.exchangesService.verifyBusinessClaimCode(req.user.id, businessId, dto.code);
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

  @Get('businesses/:id/umrah/leads')
  listUmrahLeads(@Req() req: AuthenticatedRequest, @Param('id') businessId: string) {
    return this.exchangesService.ownerListUmrahLeads(req.user.id, businessId);
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

@UseGuards(AuthGuard('jwt'))
@Controller('me/claims')
export class MeClaimsController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.exchangesService.listMyBusinessClaims(req.user.id);
  }
}

@UseGuards(AuthGuard('jwt'))
@Controller('umrah')
export class UmrahLeadsController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Post('leads')
  createLead(@Req() req: AuthenticatedRequest, @Body() dto: CreateUmrahLeadDto) {
    return this.exchangesService.createUmrahLead(req.user.id, dto);
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

@UseGuards(AuthGuard('jwt'))
@Controller('me/favorites/exchanges')
export class MeExchangeFavoritesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.exchangesService.listExchangeFavorites(req.user.id);
  }

  @Post(':businessId')
  add(@Req() req: AuthenticatedRequest, @Param('businessId') businessId: string) {
    return this.exchangesService.addExchangeFavorite(req.user.id, businessId);
  }

  @Delete(':businessId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('businessId') businessId: string,
  ) {
    return this.exchangesService.removeExchangeFavorite(req.user.id, businessId);
  }
}

@UseGuards(AuthGuard('jwt'))
@Controller('me/alerts/exchanges')
export class MeExchangeAlertsController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.exchangesService.listExchangeRateAlerts(req.user.id);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateExchangeRateAlertDto) {
    return this.exchangesService.createExchangeRateAlert(req.user.id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.exchangesService.deleteExchangeRateAlert(req.user.id, id);
  }
}

@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/claims')
export class AdminClaimsController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Get()
  list(@Query() query: ListAdminClaimsDto) {
    return this.exchangesService.adminListBusinessClaims(query.status);
  }

  @Patch(':id/approve')
  approve(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.exchangesService.adminApproveBusinessClaim(req.user.id, id);
  }

  @Patch(':id/reject')
  reject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('rejectionReason') rejectionReason?: string,
  ) {
    return this.exchangesService.adminRejectBusinessClaim(req.user.id, id, rejectionReason);
  }
}

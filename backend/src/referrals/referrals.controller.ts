import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReferralsService } from './referrals.service';
import { RedeemReferralDto } from './dto/redeem-referral.dto';

type AuthenticatedRequest = {
  user: {
    id: string;
    phoneNumber: string;
    isAdmin?: boolean;
  };
};

@UseGuards(AuthGuard('jwt'))
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return this.referralsService.getMe(req.user.id);
  }

  @Post('redeem')
  redeem(@Req() req: AuthenticatedRequest, @Body() dto: RedeemReferralDto) {
    return this.referralsService.redeem(req.user.id, dto.code);
  }
}

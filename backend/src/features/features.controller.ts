import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { FeaturesService } from './features.service';
import { CreateFeatureIdeaDto } from './dto/create-feature-idea.dto';

type AuthenticatedRequest = {
  user: {
    id: string;
    phoneNumber: string;
    isAdmin?: boolean;
  };
};

@UseGuards(AuthGuard('jwt'))
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.featuresService.listForUser(req.user.id);
  }

  @Post()
  submit(@Req() req: AuthenticatedRequest, @Body() dto: CreateFeatureIdeaDto) {
    return this.featuresService.submitIdea(req.user.id, dto);
  }

  @Get(':slug')
  getOne(@Req() req: AuthenticatedRequest, @Param('slug') slug: string) {
    return this.featuresService.getBySlugForUser(req.user.id, slug);
  }

  @Post(':slug/vote')
  toggleVote(@Req() req: AuthenticatedRequest, @Param('slug') slug: string) {
    return this.featuresService.toggleVote(req.user.id, slug);
  }
}

@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/features')
export class AdminFeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get('pending')
  listPending() {
    return this.featuresService.listPending();
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.featuresService.approve(id);
  }
}

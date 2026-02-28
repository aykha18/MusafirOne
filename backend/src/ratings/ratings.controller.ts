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
import { CreateRatingDto } from './dto/create-rating.dto';
import { RatingsService } from './ratings.service';

type AuthenticatedRequest = {
  user: {
    id: string;
    phoneNumber: string;
    isAdmin?: boolean;
  };
};

@UseGuards(AuthGuard('jwt'))
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateRatingDto) {
    return this.ratingsService.create(req.user.id, dto);
  }

  @Get('user/:userId')
  listForUser(@Param('userId') userId: string) {
    return this.ratingsService.listForUser(userId);
  }
}

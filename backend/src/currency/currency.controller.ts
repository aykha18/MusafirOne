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
import { CurrencyService } from './currency.service';
import { CreateCurrencyPostDto } from './dto/create-currency-post.dto';
import { UpdateCurrencyPostDto } from './dto/update-currency-post.dto';
import { ListCurrencyPostsDto } from './dto/list-currency-posts.dto';
import { CreateMatchRequestDto } from './dto/create-match-request.dto';

type AuthenticatedRequest = {
  user: {
    id: string;
    phoneNumber: string;
    isAdmin?: boolean;
  };
};

@UseGuards(AuthGuard('jwt'))
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Post('posts')
  createPost(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCurrencyPostDto,
  ) {
    return this.currencyService.createPost(req.user.id, dto);
  }

  @Get('posts')
  listPosts(@Query() query: ListCurrencyPostsDto) {
    return this.currencyService.listPosts(query);
  }

  @Get('posts/:id')
  getPost(@Param('id') id: string) {
    return this.currencyService.getPost(id);
  }

  @Patch('posts/:id')
  updatePost(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCurrencyPostDto,
  ) {
    return this.currencyService.updatePost(req.user.id, id, dto);
  }

  @Post('posts/:id/activate')
  activatePost(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.currencyService.activatePost(req.user.id, id);
  }

  @Post('posts/:id/cancel')
  cancelPost(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.currencyService.cancelPost(req.user.id, id);
  }

  @Post('posts/:id/requests')
  createMatchRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CreateMatchRequestDto,
  ) {
    return this.currencyService.createMatchRequest(req.user.id, id, dto);
  }

  @Get('requests')
  listMatchRequests(
    @Req() req: AuthenticatedRequest,
    @Query('role') role?: 'sent' | 'received' | 'all',
  ) {
    return this.currencyService.listMatchRequests(req.user.id, role);
  }

  @Post('requests/:id/accept')
  acceptMatchRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.currencyService.acceptMatchRequest(req.user.id, id);
  }

  @Post('requests/:id/reject')
  rejectMatchRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.currencyService.rejectMatchRequest(req.user.id, id);
  }

  @Post('requests/:id/cancel')
  cancelMatchRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.currencyService.cancelMatchRequest(req.user.id, id);
  }

  @Post('requests/:id/complete')
  completeMatchRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.currencyService.completeMatchRequest(req.user.id, id);
  }
}

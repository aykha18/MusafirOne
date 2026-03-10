import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
  Query,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

type AuthenticatedRequest = {
  user: {
    id: string;
    phoneNumber: string;
    isAdmin?: boolean;
  };
};

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.usersService.getById(req.user.id);
  }

  @Patch('me')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @UseGuards(AdminGuard)
  @Get()
  listAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.usersService.listAll(Number(page) || 1, Number(limit) || 20);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/suspend')
  suspend(@Param('id') id: string, @Body('isSuspended') isSuspended: boolean) {
    return this.usersService.suspendUser(id, isSuspended);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/verify')
  verify(@Param('id') id: string, @Body('level') level: number) {
    return this.usersService.verifyUser(id, Number(level));
  }
}

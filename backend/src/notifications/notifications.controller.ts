import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('push-token')
  @UseGuards(JwtAuthGuard)
  async registerPushToken(@Req() req, @Body() dto: RegisterPushTokenDto) {
    return this.notificationsService.registerPushToken(req.user.id, dto.token);
  }
}

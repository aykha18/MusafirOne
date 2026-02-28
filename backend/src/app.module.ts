import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CurrencyModule } from './currency/currency.module';
import { DisputesModule } from './disputes/disputes.module';
import { ParcelModule } from './parcel/parcel.module';
import { PrismaModule } from './prisma/prisma.module';
import { RatingsModule } from './ratings/ratings.module';
import { TrustModule } from './trust/trust.module';
import { UsersModule } from './users/users.module';

import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CurrencyModule,
    RatingsModule,
    TrustModule,
    ParcelModule,
    DisputesModule,
    ChatModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

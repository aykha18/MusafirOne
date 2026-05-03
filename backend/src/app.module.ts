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
import { VerificationModule } from './verification/verification.module';
import { FeaturesModule } from './features/features.module';

import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LogsModule } from './logs/logs.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReferralsModule } from './referrals/referrals.module';

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
    LogsModule,
    DashboardModule,
    VerificationModule,
    FeaturesModule,
    ReferralsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

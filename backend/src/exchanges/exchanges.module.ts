import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminBusinessesController,
  AdminReviewsController,
  BusinessesController,
  ExchangesController,
  MeExchangeAlertsController,
  MeExchangeFavoritesController,
} from './exchanges.controller';
import { ExchangesService } from './exchanges.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ExchangesController,
    AdminBusinessesController,
    BusinessesController,
    AdminReviewsController,
    MeExchangeFavoritesController,
    MeExchangeAlertsController,
  ],
  providers: [ExchangesService],
  exports: [ExchangesService],
})
export class ExchangesModule {}

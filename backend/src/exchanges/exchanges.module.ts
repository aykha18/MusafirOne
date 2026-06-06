import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminBusinessesController,
  AdminReviewsController,
  BusinessesController,
  DirectoryController,
  ExchangesController,
  MeExchangeAlertsController,
  MeExchangeFavoritesController,
} from './exchanges.controller';
import { ExchangesService } from './exchanges.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ExchangesController,
    DirectoryController,
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

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminClaimsController,
  AdminBusinessesController,
  AdminReviewsController,
  BusinessesController,
  DirectoryController,
  ExchangesController,
  MeClaimsController,
  MeExchangeAlertsController,
  MeExchangeFavoritesController,
  UmrahLeadsController,
} from './exchanges.controller';
import { ExchangesService } from './exchanges.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ExchangesController,
    DirectoryController,
    MeClaimsController,
    UmrahLeadsController,
    AdminBusinessesController,
    BusinessesController,
    AdminReviewsController,
    MeExchangeFavoritesController,
    MeExchangeAlertsController,
    AdminClaimsController,
  ],
  providers: [ExchangesService],
  exports: [ExchangesService],
})
export class ExchangesModule {}

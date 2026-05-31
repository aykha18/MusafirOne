import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminBusinessesController,
  AdminReviewsController,
  BusinessesController,
  ExchangesController,
} from './exchanges.controller';
import { ExchangesService } from './exchanges.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ExchangesController,
    AdminBusinessesController,
    BusinessesController,
    AdminReviewsController,
  ],
  providers: [ExchangesService],
  exports: [ExchangesService],
})
export class ExchangesModule {}

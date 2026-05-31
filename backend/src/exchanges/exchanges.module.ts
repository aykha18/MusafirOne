import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminBusinessesController,
  ExchangesController,
} from './exchanges.controller';
import { ExchangesService } from './exchanges.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExchangesController, AdminBusinessesController],
  providers: [ExchangesService],
  exports: [ExchangesService],
})
export class ExchangesModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrustModule } from '../trust/trust.module';
import { ParcelController } from './parcel.controller';
import { ParcelService } from './parcel.service';

@Module({
  imports: [PrismaModule, TrustModule],
  controllers: [ParcelController],
  providers: [ParcelService],
  exports: [ParcelService],
})
export class ParcelModule {}

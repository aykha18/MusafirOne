import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminFeaturesController,
  FeaturesController,
} from './features.controller';
import { FeaturesService } from './features.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeaturesController, AdminFeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}

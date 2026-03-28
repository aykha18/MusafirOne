import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrustModule } from '../trust/trust.module';
import {
  AdminVerificationController,
  VerificationController,
} from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [PrismaModule, TrustModule],
  controllers: [VerificationController, AdminVerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrustModule } from '../trust/trust.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';

@Module({
  imports: [PrismaModule, TrustModule, ReferralsModule],
  controllers: [CurrencyController],
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class CurrencyModule {}

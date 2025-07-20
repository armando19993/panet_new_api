import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CountryModule } from 'src/country/country.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { RechargeModule } from 'src/recharge/recharge.module';

@Module({
  imports: [PrismaModule, CountryModule, WalletModule, RechargeModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CountryModule } from 'src/country/country.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { RechargeModule } from 'src/recharge/recharge.module';

import { MovementsAccountJuridicModule } from 'src/movements-account-juridic/movements-account-juridic.module';
import { TelegramModule } from 'src/telegram/telegram.module';

@Module({
  imports: [PrismaModule, CountryModule, WalletModule, RechargeModule, MovementsAccountJuridicModule, TelegramModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule { }

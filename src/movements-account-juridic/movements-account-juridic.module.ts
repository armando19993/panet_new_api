import { Module } from '@nestjs/common';
import { MovementsAccountJuridicService } from './movements-account-juridic.service';
import { MovementsAccountJuridicController } from './movements-account-juridic.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TelegramModule } from 'src/telegram/telegram.module';

@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [MovementsAccountJuridicController],
  providers: [MovementsAccountJuridicService],
  exports: [MovementsAccountJuridicService],
})
export class MovementsAccountJuridicModule { }

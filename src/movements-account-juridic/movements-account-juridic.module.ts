import { Module } from '@nestjs/common';
import { MovementsAccountJuridicService } from './movements-account-juridic.service';
import { MovementsAccountJuridicController } from './movements-account-juridic.controller';

@Module({
  controllers: [MovementsAccountJuridicController],
  providers: [MovementsAccountJuridicService],
})
export class MovementsAccountJuridicModule {}

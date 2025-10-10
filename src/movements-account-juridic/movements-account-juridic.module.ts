import { Module } from '@nestjs/common';
import { MovementsAccountJuridicService } from './movements-account-juridic.service';
import { MovementsAccountJuridicController } from './movements-account-juridic.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MovementsAccountJuridicController],
  providers: [MovementsAccountJuridicService],
  exports: [MovementsAccountJuridicService],
})
export class MovementsAccountJuridicModule {}

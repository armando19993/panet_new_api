import { Module } from '@nestjs/common';
import { ColaEsperaService } from './cola-espera.service';
import { ColaEsperaController } from './cola-espera.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ColaEsperaController],
  providers: [ColaEsperaService],
})
export class ColaEsperaModule { }

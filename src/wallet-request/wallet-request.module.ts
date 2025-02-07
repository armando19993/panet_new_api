import { Module } from '@nestjs/common';
import { WalletRequestService } from './wallet-request.service';
import { WalletRequestController } from './wallet-request.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule
  ],
  controllers: [WalletRequestController],
  providers: [WalletRequestService],
})
export class WalletRequestModule {}

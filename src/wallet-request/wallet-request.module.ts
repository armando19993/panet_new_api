import { Module } from '@nestjs/common';
import { WalletRequestService } from './wallet-request.service';
import { WalletRequestController } from './wallet-request.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationService } from 'src/notification/notification.service';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [WalletRequestController],
  providers: [WalletRequestService, NotificationService],
})
export class WalletRequestModule {}

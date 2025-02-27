import { Module } from '@nestjs/common';
import { RateService } from './rate.service';
import { RateController } from './rate.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationService } from 'src/notification/notification.service';

@Module({
  imports: [PrismaModule],
  controllers: [RateController],
  providers: [RateService, NotificationService],
})
export class RateModule { }

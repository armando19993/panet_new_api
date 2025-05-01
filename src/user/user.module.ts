import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationService } from 'src/notification/notification.service';
import { WhatsappModule } from 'src/whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, WhatsappModule],
  controllers: [UserController],
  providers: [UserService, NotificationService],
})
export class UserModule { }

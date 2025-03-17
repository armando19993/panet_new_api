import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationService } from 'src/notification/notification.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService, NotificationService],
})
export class UserModule { }

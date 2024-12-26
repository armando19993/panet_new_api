import { Module } from '@nestjs/common';
import { AccountTypeService } from './account-type.service';
import { AccountTypeController } from './account-type.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccountTypeController],
  providers: [AccountTypeService],
})
export class AccountTypeModule {}

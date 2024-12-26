import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.servise";

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

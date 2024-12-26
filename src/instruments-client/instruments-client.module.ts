import { Module } from "@nestjs/common";
import { InstrumentsClientService } from "./instruments-client.service";
import { InstrumentsClientController } from "./instruments-client.controller";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [InstrumentsClientController],
  providers: [InstrumentsClientService],
})
export class InstrumentsClientModule {}

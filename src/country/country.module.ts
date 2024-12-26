import { Module } from "@nestjs/common";
import { CountryService } from "./country.service";
import { CountryController } from "./country.controller";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  controllers: [CountryController],
  providers: [CountryService],
  imports: [PrismaModule],
})
export class CountryModule {}

import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Get('home')
  home() {
    return this.reportsService.home();
  }

  @Get('country/:countryId/reception-wallets')
  getReceptionWalletsByCountry(@Param('countryId') countryId: string) {
    return this.reportsService.getReceptionWalletsByCountry(countryId);
  }

  @Get('user/:userId/daily-operations')
  getUserDailyOperations(@Param('userId') userId: string) {
    return this.reportsService.getUserDailyOperations(userId);
  }
}

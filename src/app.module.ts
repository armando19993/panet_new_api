import { Module } from "@nestjs/common";
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { WalletModule } from './wallet/wallet.module';
import { WalletTransactionsModule } from './wallet-transactions/wallet-transactions.module';
import { RechargeModule } from './recharge/recharge.module';
import { CountryModule } from './country/country.module';
import { InstrumentsClientModule } from './instruments-client/instruments-client.module';
import { ClientModule } from './client/client.module';
import { RateModule } from './rate/rate.module';
import { BankModule } from './bank/bank.module';
import { AccountTypeModule } from './account-type/account-type.module';
import { RoleModule } from './role/role.module';
import { UserRoleModule } from './user-role/user-role.module';
import { join } from "path";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ColaEsperaModule } from './cola-espera/cola-espera.module';
import { TransactionModule } from './transaction/transaction.module';
import { NotificationService } from './notification/notification.service';
import { FlowApiModule } from "./flow-api/flow-api.module";
import { WalletRequestModule } from './wallet-request/wallet-request.module';
import { TransactionsPanetPayModule } from './transactions-panet-pay/transactions-panet-pay.module';
import { RequestPaymentsPanetPayModule } from './request-payments-panet-pay/request-payments-panet-pay.module';
import { ReportsModule } from './reports/reports.module';
import { MovementsAccountJuridicModule } from './movements-account-juridic/movements-account-juridic.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads', 
    }),
    AuthModule, 
    UserModule, 
    WalletModule, 
    WalletTransactionsModule, 
    RechargeModule, 
    CountryModule, 
    InstrumentsClientModule, 
    ClientModule, 
    RateModule, 
    BankModule, 
    AccountTypeModule, 
    RoleModule, 
    UserRoleModule, 
    ColaEsperaModule, 
    TransactionModule,
    FlowApiModule,
    WalletRequestModule,
    TransactionsPanetPayModule,
    RequestPaymentsPanetPayModule,
    ReportsModule,
    MovementsAccountJuridicModule,
  ],
  controllers: [],
  providers: [NotificationService],
})
export class AppModule {}

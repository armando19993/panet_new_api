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

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads', 
    }),
    AuthModule, UserModule, WalletModule, WalletTransactionsModule, RechargeModule, CountryModule, InstrumentsClientModule, ClientModule, RateModule, BankModule, AccountTypeModule, RoleModule, UserRoleModule, ColaEsperaModule, TransactionModule],
  controllers: [],
  providers: [NotificationService],
})
export class AppModule {}

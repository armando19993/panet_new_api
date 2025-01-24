import { Module } from '@nestjs/common';
import { FlowApiService } from './flow-api.service';

@Module({
  providers: [FlowApiService],
  exports: [FlowApiService], // Exportamos para usarlo en otros módulos
})
export class FlowApiModule {}

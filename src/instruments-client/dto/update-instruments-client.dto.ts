import { PartialType } from '@nestjs/mapped-types';
import { CreateInstrumentsClientDto } from './create-instruments-client.dto';

export class UpdateInstrumentsClientDto extends PartialType(CreateInstrumentsClientDto) {}

import { PartialType } from '@nestjs/mapped-types';
import { CreateMovementsAccountJuridicDto } from './create-movements-account-juridic.dto';

export class UpdateMovementsAccountJuridicDto extends PartialType(CreateMovementsAccountJuridicDto) {}

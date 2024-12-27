import { PartialType } from '@nestjs/mapped-types';
import { CreateColaEsperaDto } from './create-cola-espera.dto';

export class UpdateColaEsperaDto extends PartialType(CreateColaEsperaDto) {}

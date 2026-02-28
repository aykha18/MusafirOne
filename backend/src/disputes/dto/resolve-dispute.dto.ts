import { IsEnum } from 'class-validator';
import { DisputeStatus } from '../disputes.types';

export class ResolveDisputeDto {
  @IsEnum(DisputeStatus)
  status!: DisputeStatus;
}

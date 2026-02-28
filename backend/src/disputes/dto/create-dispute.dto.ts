import { IsOptional, IsString, Length } from 'class-validator';

export class CreateDisputeDto {
  @IsOptional()
  @IsString()
  matchRequestId?: string;

  @IsOptional()
  @IsString()
  parcelRequestId?: string;

  @IsString()
  @Length(1, 500)
  reason!: string;
}

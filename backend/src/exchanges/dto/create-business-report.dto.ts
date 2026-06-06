import { IsOptional, IsString, Length } from 'class-validator';

export class CreateBusinessReportDto {
  @IsString()
  @Length(2, 80)
  reason!: string;

  @IsOptional()
  @IsString()
  @Length(2, 1000)
  details?: string;
}


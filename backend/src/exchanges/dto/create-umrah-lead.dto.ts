import { IsOptional, IsString, Length } from 'class-validator';

export class CreateUmrahLeadDto {
  @IsString()
  @Length(10, 80)
  businessId!: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  message?: string;
}

import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateExchangeRateAlertDto {
  @IsString()
  @Length(2, 10)
  fromCurrency!: string;

  @IsString()
  @Length(2, 10)
  toCurrency!: string;

  @IsString()
  @IsIn(['buy', 'sell'])
  direction!: string;

  @IsString()
  @Length(1, 40)
  targetRate!: string;

  @IsOptional()
  @IsString()
  @IsIn(['0', '1', 'true', 'false'])
  isActive?: string;
}

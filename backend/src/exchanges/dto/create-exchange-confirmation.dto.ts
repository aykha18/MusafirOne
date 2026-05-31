import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateExchangeConfirmationDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  offerId?: string;

  @IsString()
  @Length(2, 10)
  fromCurrency!: string;

  @IsString()
  @Length(2, 10)
  toCurrency!: string;

  @IsString()
  @Length(1, 40)
  amount!: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  rateObserved?: string;

  @IsOptional()
  @IsString()
  @IsIn(['user_confirmed'])
  status?: string;
}

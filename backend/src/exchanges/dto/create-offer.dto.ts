import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateOfferDto {
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
  rate!: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  minAmount?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  maxAmount?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  feeNote?: string;
}

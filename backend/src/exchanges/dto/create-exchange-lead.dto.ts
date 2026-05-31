import { IsIn, IsString, Length } from 'class-validator';

export class CreateExchangeLeadDto {
  @IsString()
  @Length(2, 10)
  fromCurrency!: string;

  @IsString()
  @Length(2, 10)
  toCurrency!: string;

  @IsString()
  @Length(1, 40)
  amount!: string;

  @IsString()
  @IsIn(['call', 'whatsapp', 'directions', 'share', 'other'])
  channel!: string;
}

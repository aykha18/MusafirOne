import { IsDateString, IsNumber, IsString, Length, Min } from 'class-validator';

export class CreateCurrencyPostDto {
  @IsString()
  @Length(3, 10)
  haveCurrency!: string;

  @IsString()
  @Length(3, 10)
  needCurrency!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsNumber()
  @Min(0)
  preferredRate!: number;

  @IsString()
  @Length(1, 100)
  city!: string;

  @IsDateString()
  expiryDate!: string;
}

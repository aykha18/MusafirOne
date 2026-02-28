import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateCurrencyPostDto {
  @IsOptional()
  @IsString()
  @Length(3, 10)
  haveCurrency?: string;

  @IsOptional()
  @IsString()
  @Length(3, 10)
  needCurrency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  preferredRate?: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

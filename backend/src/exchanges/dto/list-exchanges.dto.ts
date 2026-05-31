import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class ListExchangesDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  fromCurrency?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  toCurrency?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  amount?: string;

  @IsOptional()
  @IsString()
  @IsIn(['0', '1', 'true', 'false'])
  openNow?: string;

  @IsOptional()
  @IsString()
  @IsIn(['bestRate', 'nearby', 'topRated'])
  sort?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  lat?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  lng?: string;
}

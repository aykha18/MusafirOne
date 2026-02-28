import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class ListCurrencyPostsDto {
  @IsOptional()
  @IsString()
  @Length(3, 10)
  haveCurrency?: string;

  @IsOptional()
  @IsString()
  @Length(3, 10)
  needCurrency?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize?: number;
}

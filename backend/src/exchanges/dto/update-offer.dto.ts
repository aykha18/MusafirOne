import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateOfferDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  rate?: string;

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

  @IsOptional()
  @IsString()
  @IsIn(['buy', 'sell'])
  direction?: string;
}

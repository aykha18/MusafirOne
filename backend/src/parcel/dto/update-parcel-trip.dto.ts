import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateParcelTripDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  fromCountry?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  toCountry?: string;

  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @IsOptional()
  @IsDateString()
  arrivalDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  maxWeightKg?: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  allowedCategories?: string;
}

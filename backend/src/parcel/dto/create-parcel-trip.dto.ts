import { IsDateString, IsNumber, IsString, Length, Min } from 'class-validator';

export class CreateParcelTripDto {
  @IsString()
  @Length(2, 100)
  fromCountry!: string;

  @IsString()
  @Length(2, 100)
  toCountry!: string;

  @IsDateString()
  departureDate!: string;

  @IsDateString()
  arrivalDate!: string;

  @IsNumber()
  @Min(0.1)
  maxWeightKg!: number;

  @IsString()
  @Length(0, 255)
  allowedCategories!: string;
}

import { IsDateString, IsNumber, IsString, Length, Min } from 'class-validator';

export class CreateParcelRequestDto {
  @IsString()
  @Length(1, 100)
  itemType!: string;

  @IsNumber()
  @Min(0.1)
  weightKg!: number;

  @IsString()
  @Length(2, 100)
  fromCountry!: string;

  @IsString()
  @Length(2, 100)
  toCountry!: string;

  @IsDateString()
  flexibleFromDate!: string;

  @IsDateString()
  flexibleToDate!: string;
}

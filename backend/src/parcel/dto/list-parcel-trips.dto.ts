import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class ListParcelTripsDto {
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
  departureFrom?: string;

  @IsOptional()
  @IsDateString()
  departureTo?: string;

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

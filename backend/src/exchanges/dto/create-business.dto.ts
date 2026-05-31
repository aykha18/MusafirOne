import { IsIn, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @IsIn(['exchange', 'umrah'])
  type!: string;

  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  website?: string;

  @IsString()
  @Length(2, 100)
  branchCity!: string;

  @IsString()
  @Length(2, 200)
  branchAddress!: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  branchLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  branchLng?: number;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  branchTimeZone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 10000)
  branchHoursJson?: string;
}

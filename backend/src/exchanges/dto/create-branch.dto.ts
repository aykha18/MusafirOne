import { IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @Length(2, 100)
  city!: string;

  @IsString()
  @Length(2, 200)
  address!: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  timeZone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 10000)
  hoursJson?: string;
}

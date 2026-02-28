import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateRatingDto {
  @IsOptional()
  @IsString()
  matchRequestId?: string;

  @IsOptional()
  @IsString()
  parcelRequestId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  reliabilityScore!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  communicationScore!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  timelinessScore!: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  comment?: string;
}

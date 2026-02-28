import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  corridor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  verificationLevel?: number;
}

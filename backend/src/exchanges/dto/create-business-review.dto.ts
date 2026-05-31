import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateBusinessReviewDto {
  @IsString()
  @Length(1, 100)
  confirmationId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rateFairnessScore!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  serviceScore!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  speedScore!: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  comment?: string;
}

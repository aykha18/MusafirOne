import { IsOptional, IsString, Length } from 'class-validator';

export class CreateFeatureIdeaDto {
  @IsString()
  @Length(3, 80)
  title!: string;

  @IsString()
  @Length(10, 160)
  shortDescription!: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  longDescription?: string;
}

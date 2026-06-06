import { IsString, Length } from 'class-validator';

export class MergeBusinessesDto {
  @IsString()
  @Length(10, 80)
  sourceBusinessId!: string;
}


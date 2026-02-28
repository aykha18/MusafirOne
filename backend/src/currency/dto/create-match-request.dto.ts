import { IsOptional, IsString, Length } from 'class-validator';

export class CreateMatchRequestDto {
  @IsOptional()
  @IsString()
  @Length(0, 255)
  message?: string;
}

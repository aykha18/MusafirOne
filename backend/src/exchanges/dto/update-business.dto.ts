import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

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
}

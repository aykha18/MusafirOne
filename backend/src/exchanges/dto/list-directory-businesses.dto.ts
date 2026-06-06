import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class ListDirectoryBusinessesDto {
  @IsString()
  @IsIn(['exchange', 'umrah'])
  type!: 'exchange' | 'umrah';

  @IsOptional()
  @IsString()
  @Length(2, 100)
  city?: string;
}

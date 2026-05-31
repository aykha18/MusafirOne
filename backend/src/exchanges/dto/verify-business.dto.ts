import { IsBoolean } from 'class-validator';

export class VerifyBusinessDto {
  @IsBoolean()
  isVerified!: boolean;
}

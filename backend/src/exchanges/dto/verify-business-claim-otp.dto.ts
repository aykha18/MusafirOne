import { IsString, Length } from 'class-validator';

export class VerifyBusinessClaimOtpDto {
  @IsString()
  @Length(4, 10)
  code!: string;
}

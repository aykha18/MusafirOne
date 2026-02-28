import { IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Length(6, 20)
  phoneNumber!: string;

  @IsString()
  @Length(4, 8)
  code!: string;

  @IsString()
  @Length(0, 255)
  deviceFingerprint!: string;
}

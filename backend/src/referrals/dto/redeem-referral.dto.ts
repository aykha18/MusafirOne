import { IsString, Length, Matches } from 'class-validator';

export class RedeemReferralDto {
  @IsString()
  @Length(6, 16)
  @Matches(/^[A-Z0-9]+$/i)
  code!: string;
}

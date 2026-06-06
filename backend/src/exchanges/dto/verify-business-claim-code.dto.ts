import { IsString, Length } from 'class-validator';

export class VerifyBusinessClaimCodeDto {
  @IsString()
  @Length(4, 12)
  code!: string;
}


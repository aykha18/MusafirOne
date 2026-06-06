import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateBusinessClaimDto {
  @IsString()
  @IsIn(['phone_otp', 'docs', 'in_person_code'])
  method!: 'phone_otp' | 'docs' | 'in_person_code';

  @IsOptional()
  @IsString()
  @Length(5, 40)
  phoneToVerify?: string;

  @IsOptional()
  @IsString()
  @Length(2, 5000)
  docsJson?: string;
}

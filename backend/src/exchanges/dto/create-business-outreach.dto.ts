import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateBusinessOutreachDto {
  @IsString()
  @IsIn(['phone', 'whatsapp', 'in_person', 'email', 'other'])
  channel!: string;

  @IsString()
  @IsIn(['attempted', 'contacted', 'interested', 'not_interested', 'follow_up', 'claimed'])
  outcome!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  note?: string;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  nextFollowUpAt?: string;
}

import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListAdminReportsDto {
  @IsOptional()
  @IsString()
  @IsIn(['open', 'resolved'])
  status?: string;
}


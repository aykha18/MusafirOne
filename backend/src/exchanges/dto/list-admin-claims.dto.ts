import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListAdminClaimsDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: string;
}

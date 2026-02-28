import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsNotEmpty()
  @IsString()
  targetUserId: string;

  @IsOptional()
  @IsString()
  matchRequestId?: string;

  @IsOptional()
  @IsString()
  parcelRequestId?: string;
}

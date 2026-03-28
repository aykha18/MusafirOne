import { VerificationDocumentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class ReviewVerificationDocumentDto {
  @IsEnum(VerificationDocumentStatus)
  status!: VerificationDocumentStatus;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  rejectionReason?: string;
}

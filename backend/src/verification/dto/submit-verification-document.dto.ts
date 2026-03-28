import { VerificationDocumentType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SubmitVerificationDocumentDto {
  @IsEnum(VerificationDocumentType)
  type!: VerificationDocumentType;
}

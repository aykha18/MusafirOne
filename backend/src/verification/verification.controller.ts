import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { diskStorage } from 'multer';
import { AdminGuard } from '../auth/admin.guard';
import { VerificationDocumentStatus } from '@prisma/client';
import { SubmitVerificationDocumentDto } from './dto/submit-verification-document.dto';
import { ReviewVerificationDocumentDto } from './dto/review-verification-document.dto';
import { VerificationService } from './verification.service';

type AuthenticatedRequest = {
  user: {
    id: string;
    phoneNumber: string;
    isAdmin?: boolean;
  };
};

function getUploadBaseDir() {
  const dir = resolve(process.cwd(), 'uploads', 'verification');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function isAllowedMimeType(mimeType: string) {
  return (
    mimeType === 'application/pdf' ||
    mimeType === 'image/jpeg' ||
    mimeType === 'image/png'
  );
}

@UseGuards(AuthGuard('jwt'))
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('documents/me')
  listMine(@Req() req: AuthenticatedRequest) {
    return this.verificationService.listMyDocuments(req.user.id);
  }

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, getUploadBaseDir()),
        filename: (req, file, cb) => {
          const authReq = req as unknown as AuthenticatedRequest;
          const safeExt = extname(file.originalname).slice(0, 10);
          const token = randomBytes(8).toString('hex');
          cb(
            null,
            `${authReq.user.id}_${Date.now()}_${token}${safeExt}`.replace(
              /[^a-zA-Z0-9._-]/g,
              '_',
            ),
          );
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        if (!isAllowedMimeType(file.mimetype)) {
          cb(new Error('Unsupported file type'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async submitDocument(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubmitVerificationDocumentDto,
    @UploadedFile() file?: any,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.verificationService.submitDocument({
      userId: req.user.id,
      type: dto.type,
      fileName: file.originalname,
      mimeType: file.mimetype,
      storagePath: file.path,
    });
  }
}

@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/verification')
export class AdminVerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('documents')
  listAll(
    @Query('status') status?: VerificationDocumentStatus,
    @Query('userId') userId?: string,
  ) {
    const parsedStatus =
      status && Object.values(VerificationDocumentStatus).includes(status)
        ? status
        : undefined;
    return this.verificationService.listAll({
      status: parsedStatus,
      userId: userId || undefined,
    });
  }

  @Post('documents/:id/review')
  review(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReviewVerificationDocumentDto,
  ) {
    return this.verificationService.reviewDocument({
      adminUserId: req.user.id,
      id,
      status: dto.status,
      rejectionReason: dto.rejectionReason,
    });
  }

  @Get('documents/:id/download')
  async download(@Param('id') id: string, @Res() res: any) {
    const doc = await this.verificationService.getByIdForAdmin(id);
    const baseDir = getUploadBaseDir();
    const resolvedPath = resolve(doc.storagePath);
    const normalizedBase = baseDir.endsWith(sep) ? baseDir : `${baseDir}${sep}`;
    if (!resolvedPath.startsWith(normalizedBase)) {
      res.status(400).json({ message: 'Invalid storage path' });
      return;
    }
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${doc.fileName.replace(/"/g, '')}"`,
    );
    createReadStream(resolvedPath).pipe(res);
  }
}

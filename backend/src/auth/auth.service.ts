import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

type JwtPayload = {
  sub: string;
  phoneNumber?: string;
  email?: string;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async requestOtp(dto: RequestOtpDto): Promise<{ message: string }> {
    const code = this.generateCode();
    const hash = this.hashCode(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otpRequest.create({
      data: {
        phoneNumber: dto.phoneNumber,
        codeHash: hash,
        expiresAt,
      },
    });
    this.sendSms(dto.phoneNumber, code);

    return { message: 'OTP sent successfully' };
  }

  private sendSms(phoneNumber: string, code: string): void {
    this.logger.log(`[SMS GATEWAY] Sending OTP to ${phoneNumber}: ${code}`);
  }

  async verifyGoogleToken(dto: GoogleLoginDto): Promise<AuthTokens> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google Token payload');
      }

      const email = payload.email;
      const googleId = payload.sub;

      let user = await this.prisma.user.findFirst({
        where: {
          OR: [{ googleId }, { email }],
        },
      });

      if (!user) {
        const placeholderPhone = `google_${googleId}`;

        user = await this.prisma.user.create({
          data: {
            email,
            googleId,
            phoneNumber: placeholderPhone,
            fullName: payload.name || 'Google User',
            city: '',
            corridor: '',
            verificationLevel: 0,
          },
        });
      } else {
        if (!user.googleId) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { googleId },
          });
        }
      }

      if (dto.deviceFingerprint.length > 0) {
        const existingDevice = await this.prisma.userDevice.findFirst({
          where: {
            userId: user.id,
            fingerprint: dto.deviceFingerprint,
          },
        });
        if (existingDevice) {
          await this.prisma.userDevice.update({
            where: { id: existingDevice.id },
            data: { lastSeenAt: new Date() },
          });
        } else {
          await this.prisma.userDevice.create({
            data: {
              userId: user.id,
              fingerprint: dto.deviceFingerprint,
            },
          });
        }
      }

      return this.issueTokens(user.id, user.phoneNumber);
    } catch (error) {
      this.logger.error(`Google Verify Error: ${error}`);
      throw new UnauthorizedException('Invalid Google Token');
    }
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
    const otpRecord = await this.prisma.otpRequest.findFirst({
      where: {
        phoneNumber: dto.phoneNumber,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    if (!otpRecord) {
      throw new UnauthorizedException('Invalid code');
    }
    const hash = this.hashCode(dto.code);
    if (otpRecord.codeHash !== hash) {
      await this.prisma.otpRequest.update({
        where: { id: otpRecord.id },
        data: {
          attempts: otpRecord.attempts + 1,
        },
      });
      throw new UnauthorizedException('Invalid code');
    }
    await this.prisma.otpRequest.update({
      where: { id: otpRecord.id },
      data: {
        consumedAt: new Date(),
      },
    });
    const existingUser = await this.prisma.user.findUnique({
      where: {
        phoneNumber: dto.phoneNumber,
      },
    });
    const user =
      existingUser ??
      (await this.prisma.user.create({
        data: {
          phoneNumber: dto.phoneNumber,
          fullName: '',
          city: '',
          corridor: '',
          verificationLevel: 0,
        },
      }));
    if (dto.deviceFingerprint.length > 0) {
      const existingDevice = await this.prisma.userDevice.findFirst({
        where: {
          userId: user.id,
          fingerprint: dto.deviceFingerprint,
        },
      });
      if (existingDevice) {
        await this.prisma.userDevice.update({
          where: {
            id: existingDevice.id,
          },
          data: {
            lastSeenAt: new Date(),
          },
        });
      } else {
        await this.prisma.userDevice.create({
          data: {
            userId: user.id,
            fingerprint: dto.deviceFingerprint,
          },
        });
      }
    }
    return this.issueTokens(user.id, user.phoneNumber);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: {
        token: dto.refreshToken,
      },
      include: {
        user: true,
      },
    });
    if (!stored || stored.revoked || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.issueTokens(stored.userId, stored.user.phoneNumber);
  }

  private async issueTokens(
    userId: string,
    phoneNumber: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      phoneNumber,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });
    return {
      accessToken,
      refreshToken,
    };
  }

  private generateCode(): string {
    const n = randomBytes(3).readUIntBE(0, 3) % 900000;
    const value = 100000 + n;
    return value.toString();
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}

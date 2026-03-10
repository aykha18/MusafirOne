import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  phoneNumber: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev_jwt_secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });
    if (!user || user.isSuspended || user.deletedAt) {
      console.log('JwtStrategy: User not found or suspended', {
        payload,
        user,
      });
      throw new UnauthorizedException();
    }
    console.log('JwtStrategy: User validated', {
      id: user.id,
      isAdmin: user.isAdmin,
    });
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      isAdmin: user.isAdmin,
    };
  }
}

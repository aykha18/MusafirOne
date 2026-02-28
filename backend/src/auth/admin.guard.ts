import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

type AuthenticatedUser = {
  id: string;
  phoneNumber: string;
  isAdmin?: boolean;
};

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    return Boolean(user && user.isAdmin);
  }
}

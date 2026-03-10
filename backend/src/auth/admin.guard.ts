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
    if (!user || !user.isAdmin) {
      console.log('AdminGuard: Access denied', { user });
    } else {
      console.log('AdminGuard: Access granted', { userId: user.id });
    }
    return Boolean(user && user.isAdmin);
  }
}

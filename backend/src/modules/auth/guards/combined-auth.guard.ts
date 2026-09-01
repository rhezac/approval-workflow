import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, REQUIRE_API_KEY } from '../../../common/decorators/auth.decorator';
import { ApiKeyGuard } from './api-key.guard';

@Injectable()
export class CombinedAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private reflector: Reflector,
    private apiKeyGuard: ApiKeyGuard,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const reqApiKey = this.reflector.getAllAndOverride<boolean>(REQUIRE_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.query.apiKey;

    if (reqApiKey || apiKey) {
      try {
        return this.apiKeyGuard.canActivate(context);
      } catch (err) {
        if (reqApiKey) throw err;
      }
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}

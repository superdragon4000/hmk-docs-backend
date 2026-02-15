import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../jwt-payload.interface';
import { RequestWithUser } from '../../common/types/request-with-user.type';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser & { refreshToken?: string }>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const token = authHeader.slice(7);

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
      };
      request.refreshToken = token;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}

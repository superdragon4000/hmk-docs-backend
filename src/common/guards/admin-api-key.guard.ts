import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const providedKey = request.headers['x-admin-key'];
    const configuredKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!configuredKey || !providedKey || configuredKey !== providedKey) {
      throw new UnauthorizedException('Invalid admin key');
    }

    return true;
  }
}

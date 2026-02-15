import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { JwtPayload } from './jwt-payload.interface';
import { MailService } from '../mail/mail.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
  ) {}

  async register(email: string, password: string): Promise<TokenPair> {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const saltRounds = this.getBcryptSaltRounds();
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await this.usersService.create(email, passwordHash);

    // await this.mailService.sendWelcomeEmail(user.email);

    return this.issueTokens(user);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async refresh(userId: string, refreshToken: string): Promise<TokenPair> {
    const tokenEntity = await this.refreshTokensRepository.findOne({
      where: { userId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, tokenEntity.tokenHash);
    if (!tokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenEntity.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    tokenEntity.revokedAt = new Date();
    await this.refreshTokensRepository.save(tokenEntity);

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokensRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'access',
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_TTL', '15m') as never,
    });

    const refreshPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_TTL', '30d') as never,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = this.resolveRefreshExpiryDate();

    const refreshTokenEntity = this.refreshTokensRepository.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
      revokedAt: null,
      ip: null,
      userAgent: null,
    });

    await this.refreshTokensRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
    };
  }

  private resolveRefreshExpiryDate(): Date {
    const ttl = this.configService.get<string>('JWT_REFRESH_TTL', '30d');
    const match = ttl.match(/^(\d+)([smhd])$/);

    if (!match) {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const value = Number(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }

  private getBcryptSaltRounds(): number {
    const rawValue = this.configService.get<string>('BCRYPT_SALT_ROUNDS', '12');
    const parsed = Number.parseInt(rawValue, 10);

    if (!Number.isFinite(parsed) || parsed < 4 || parsed > 15) {
      return 12;
    }

    return parsed;
  }
}

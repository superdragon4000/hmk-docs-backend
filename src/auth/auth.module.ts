import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RefreshToken } from './refresh-token.entity';
import { MailModule } from '../mail/mail.module';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([RefreshToken]), UsersModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard, RefreshTokenGuard],
  exports: [JwtModule, AuthService, AccessTokenGuard, RefreshTokenGuard],
})
export class AuthModule {}

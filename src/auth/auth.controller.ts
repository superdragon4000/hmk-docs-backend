import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { RequestUser } from '../common/types/request-with-user.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register by email and password' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token with refresh token in Bearer header' })
  refresh(
    @CurrentUser() user: RequestUser,
    @Req() req: Request & { refreshToken?: string },
  ) {
    return this.authService.refresh(user.id, req.refreshToken ?? '');
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Revoke all active refresh tokens for current user' })
  logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  me(@CurrentUser() user: RequestUser) {
    return user;
  }
}

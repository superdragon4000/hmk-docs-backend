import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-with-user.type';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current subscription status' })
  status(@CurrentUser() user: RequestUser) {
    return this.subscriptionsService.getStatus(user.id);
  }
}

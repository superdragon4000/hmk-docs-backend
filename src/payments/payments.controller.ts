import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RequestUser } from '../common/types/request-with-user.type';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Post('create')
  @ApiOperation({ summary: 'Create YooKassa payment' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(user.id, dto.plan);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get current user payment status by ID' })
  getOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.paymentsService.getUserPayment(user.id, id);
  }

  @Public()
  @Post('yookassa/webhook')
  @ApiOperation({ summary: 'YooKassa webhook endpoint' })
  async webhook(@Body() payload: Record<string, any>) {
    await this.paymentsService.handleYooKassaWebhook(payload);
    return { ok: true };
  }
}

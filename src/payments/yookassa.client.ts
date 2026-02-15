import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface YooKassaCreatePaymentInput {
  idempotenceKey: string;
  amount: string;
  currency: string;
  description: string;
  metadata: Record<string, string>;
}

@Injectable()
export class YooKassaClient {
  constructor(private readonly configService: ConfigService) {}

  async createPayment(input: YooKassaCreatePaymentInput): Promise<Record<string, any>> {
    return this.request('/payments', {
      method: 'POST',
      idempotenceKey: input.idempotenceKey,
      body: {
        amount: {
          value: input.amount,
          currency: input.currency,
        },
        confirmation: {
          type: 'redirect',
          return_url: this.configService.getOrThrow<string>('YOOKASSA_RETURN_URL'),
        },
        capture: true,
        description: input.description,
        metadata: input.metadata,
      },
    });
  }

  async getPayment(paymentId: string): Promise<Record<string, any>> {
    return this.request(`/payments/${paymentId}`, { method: 'GET' });
  }

  private async request(
    path: string,
    params: {
      method: 'GET' | 'POST';
      body?: Record<string, unknown>;
      idempotenceKey?: string;
    },
  ): Promise<Record<string, any>> {
    const shopId = this.configService.getOrThrow<string>('YOOKASSA_SHOP_ID');
    const secretKey = this.configService.getOrThrow<string>('YOOKASSA_SECRET_KEY');
    const apiUrl = this.configService.get<string>('YOOKASSA_API_URL', 'https://api.yookassa.ru/v3');
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');

    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    if (params.idempotenceKey) {
      headers['Idempotence-Key'] = params.idempotenceKey;
    }

    const response = await fetch(`${apiUrl}${path}`, {
      method: params.method,
      headers,
      body: params.body ? JSON.stringify(params.body) : undefined,
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      throw new InternalServerErrorException(
        `YooKassa error: ${response.status} ${JSON.stringify(data)}`,
      );
    }

    return data;
  }
}

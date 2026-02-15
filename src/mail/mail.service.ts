import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT', 587),
      secure: this.configService.get<string>('MAIL_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });

    this.from = this.configService.get<string>('MAIL_FROM', 'noreply@example.com');
  }

  async sendWelcomeEmail(email: string): Promise<void> {
    await this.sendMailSafe({
      to: email,
      subject: 'Добро пожаловать в HMK Docs',
      text: 'Аккаунт создан. Теперь вы можете оформить доступ к PDF-каталогам.',
    });
  }

  async sendPaymentCreatedEmail(email: string, confirmationUrl: string): Promise<void> {
    await this.sendMailSafe({
      to: email,
      subject: 'Оплата создана',
      text: `Перейдите по ссылке для завершения оплаты: ${confirmationUrl}`,
    });
  }

  async sendPaymentSucceededEmail(email: string, endsAt: Date): Promise<void> {
    await this.sendMailSafe({
      to: email,
      subject: 'Оплата подтверждена',
      text: `Подписка активирована до ${endsAt.toISOString()}.`,
    });
  }

  async sendPaymentFailedEmail(email: string): Promise<void> {
    await this.sendMailSafe({
      to: email,
      subject: 'Оплата отменена',
      text: 'Оплата не была завершена. Вы можете создать новый платеж.',
    });
  }

  private async sendMailSafe(params: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
      });
    } catch (error) {
      this.logger.warn(`Email send failed for ${params.to}: ${(error as Error).message}`);
    }
  }
}

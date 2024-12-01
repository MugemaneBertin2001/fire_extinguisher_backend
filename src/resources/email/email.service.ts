import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name, { timestamp: true });

  constructor(private readonly mailerService: MailerService) {}

  async sendWelcomeEmail(to: string) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Welcome to FireTrack360',
        text: 'Welcome to FireTrack360',
      });
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error('Email sending failed:', error.stack);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }
}

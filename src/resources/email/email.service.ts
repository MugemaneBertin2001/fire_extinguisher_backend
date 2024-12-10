import { Injectable, Logger } from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name, { timestamp: true });

  constructor(
    private readonly httpService: HttpService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  private async sendEmail(to: string, subject: string, text: string): Promise<void> {
    try {
      const response = await this.httpService.post(process.env.EMAIL_API_URL, {
        to,
        subject,
        text,
      }).toPromise();

      if (response.status === 200) {
        this.logger.log(`Email sent to ${to} with subject "${subject}"`);
      } else {
        this.logger.error(`Failed to send email: ${response.statusText}`);
        throw new Error(`Failed to send email: ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error('Error sending email:', error.stack || error.message);
      throw new Error('Failed to send email.');
    }
  }

  async sendVerificationEmail(to: string, otp: string): Promise<void> {
    const text = this.emailTemplateService.generateVerificationEmailTemplate(otp);
    await this.sendEmail(to, 'Verify Your Email - FireTrack360', text);
  }

  async sendConfirmationEmail(to: string): Promise<void> {
    const text = this.emailTemplateService.generateConfirmationEmailTemplate(to);
    await this.sendEmail(to, 'Email Successfully Verified - FireTrack360', text);
  }

  async sendForgetPasswordEmail(email: string, otp: string): Promise<void> {
    const text = this.emailTemplateService.generateForgetPasswordTemplate(email, otp);
    await this.sendEmail(email, 'Password Reset Request', text);
  }

  async sendTwoFactorAuthEmail(email: string, otp: string): Promise<void> {
    const text = this.emailTemplateService.generateTwoFactorAuthEmailTemplate(email, otp);
    await this.sendEmail(email, 'Two-Factor Authentication Code', text);
  }
}

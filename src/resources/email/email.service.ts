import { Injectable, Logger } from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name, { timestamp: true });

  constructor(
    private readonly httpService: HttpService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  private sendEmail(to: string, subject: string, text: string): void {
    firstValueFrom(
      this.httpService.post(process.env.EMAIL_API_URL, {
        to,
        subject,
        text,
      })
    )
      .then(response => {
        if (response.status === 200) {
          this.logger.log(`Email sent successfully to ${to} with subject "${subject}"`);
        } else {
          this.logger.warn(
            `Non-200 status code when sending email to ${to}: ${response.status} ${response.statusText}`
          );
        }
      })
      .catch(error => {
        this.logger.error(
          `Failed to send email to ${to}: ${error.message}`,
          error.stack
        );
      });
  }

  sendVerificationEmail(to: string, otp: string): void {
    const text = this.emailTemplateService.generateVerificationEmailTemplate(otp);
    this.sendEmail(to, 'Verify Your Email - FireTrack360', text);
  }

  sendConfirmationEmail(to: string): void {
    const text = this.emailTemplateService.generateConfirmationEmailTemplate(to);
    this.sendEmail(to, 'Email Successfully Verified - FireTrack360', text);
  }

  sendForgetPasswordEmail(email: string, otp: string): void {
    const text = this.emailTemplateService.generateForgetPasswordTemplate(email, otp);
    this.sendEmail(email, 'Password Reset Request', text);
  }

  sendTwoFactorAuthEmail(email: string, otp: string): void {
    const text = this.emailTemplateService.generateTwoFactorAuthEmailTemplate(email, otp);
    this.sendEmail(email, 'Two-Factor Authentication Code', text);
  }
}
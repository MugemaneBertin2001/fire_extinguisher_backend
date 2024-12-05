import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailTemplateService } from './email-template.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name, { timestamp: true });

  constructor(
    private readonly mailerService: MailerService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async sendVerificationEmail(to: string, otp: string) {
    try {
      const htmlTemplate =
        this.emailTemplateService.generateVerificationEmailTemplate(otp);

      await this.mailerService.sendMail({
        to,
        subject: 'Verify Your Email - FireTrack360',
        html: htmlTemplate,
      });

      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error('Email sending failed:', error.stack);
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }
  /**
   * Send confirmation email after successful verification
   * @param to Recipient's email address
   * @param name User's name to personalize the email
   */
  async sendConfirmationEmail(to: string) {
    try {
      const htmlTemplate =
        this.emailTemplateService.generateConfirmationEmailTemplate(to);

      await this.mailerService.sendMail({
        to,
        subject: 'Email Successfully Verified - FireTrack360',
        html: htmlTemplate,
      });

      this.logger.log(`Confirmation email sent to ${to}`);
    } catch (error) {
      this.logger.error('Email sending failed:', error.stack);
      throw new Error(`Failed to send confirmation email: ${error.message}`);
    }
  }

  /**
   * Sends a password reset email with an OTP to the specified email address.
   *
   * @param email - The recipient's email address.
   * @param otp - The one-time password for resetting the user's password.
   * @throws Error if the email sending fails.
   */
  async sendForgetPasswordEmail(email: string, otp: string): Promise<void> {
    try {
      const htmlTemplate =
        this.emailTemplateService.generateForgetPasswordTemplate(email, otp);
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Request',
        html: htmlTemplate,
      });
    } catch (error) {
      this.logger.error('Error sending email:', error.message);
      throw new Error('Failed to send password reset email.');
    }
  }
  /**
   * Sends a password reset email with an OTP to the specified email address.
   *
   * @param email - The recipient's email address.
   * @param otp - The one-time password for resetting the user's password.
   * @throws Error if the email sending fails.
   */
  async sendTwoFactorAuthEmail(email: string, otp: string): Promise<void> {
    try {
      const htmlTemplate =
        this.emailTemplateService.generateTwoFactorAuthEmailTemplate(
          email,
          otp,
        );
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Request',
        html: htmlTemplate,
      });
    } catch (error) {
      this.logger.error('Error sending email:', error.message);
      throw new Error('Failed to send password reset email.');
    }
  }
}

import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendWelcomeEmail(to: string, username: string) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Welcome to FireTrack360',
        text: 'Welcome to FireTrack360',
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send welcome email');
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string) {
    try {
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      await this.mailerService.sendMail({
        to,
        subject: 'Password Reset for FireTrack360',
        template: 'password-reset',
        context: {
          resetLink,
        },
      });
    } catch (error) {
      console.error('Password reset email failed:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

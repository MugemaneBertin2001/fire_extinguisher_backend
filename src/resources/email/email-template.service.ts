import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailTemplateService {
  /**
   * Base styles for all email templates
   * @returns Common CSS for consistent email design
   */
  private getBaseStyles(): string {
    return `
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .otp-code {
          background-color: #f0f0f0;
          border: 2px dashed #007bff;
          color: #007bff;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 8px;
          text-align: center;
          padding: 15px;
          margin: 20px 0;
          border-radius: 6px;
        }
        .footer {
          text-align: center;
          color: #888;
          font-size: 12px;
          margin-top: 20px;
          border-top: 1px solid #eee;
          padding-top: 10px;
        }
        @media (max-width: 600px) {
          .container {
            padding: 15px;
          }
          .otp-code {
            font-size: 20px;
            letter-spacing: 4px;
          }
        }
      </style>
    `;
  }

  /**
   * Create common HTML structure for email templates
   * @param title Email template title
   * @param content Main content of the email
   * @returns Complete HTML email template
   */
  private createEmailTemplate(title: string, content: string): string {
    const currentYear = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${this.getBaseStyles()}
</head>
<body>
    <div class="container">
        <h2>${title}</h2>
        
        ${content}
        
        <div class="footer">
            © ${currentYear} FireTrack360. All rights reserved.
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate verification email template with OTP
   * @param otp One-time password
   * @returns HTML email template
   */
  generateVerificationEmailTemplate(otp: string): string {
    const content = `
        <p>Thank you for signing up! To verify your email, please use the following One-Time Password (OTP):</p>
        
        <div class="otp-code">${otp}</div>
        
        <p>This OTP will expire in soon. Do not share this code with anyone.</p>
        
        <p>If you did not request this verification, please ignore this email.</p>
    `;

    return this.createEmailTemplate('Email Verification', content);
  }

  /**
   * Generate confirmation email template after successful verification
   * @param name User's name for personalization
   * @returns HTML email template
   */
  generateConfirmationEmailTemplate(name: string): string {
    const content = `
        <p>Hello ${name},</p>
        
        <p>Congratulations! Your email address has been successfully verified with FireTrack360.</p>
        
        <p>Thank you for registering with us. You can now start using our platform.</p>
        
        <p>Best regards,<br>FireTrack360 Team</p>
    `;

    return this.createEmailTemplate('Verification Successful', content);
  }

  /**
   * Generate password reset email template
   * @param email Recipient's email address
   * @param otp One-time password for reset
   * @returns HTML email template
   */
  generateForgetPasswordTemplate(email: string, otp: string): string {
    const content = `
        <p>Hi,</p>
        
        <p>We received a request to reset the password for your account associated with <strong>${email}</strong>.</p>
        
        <p>Use the OTP below to reset your password:</p>
        
        <div class="otp-code">${otp}</div>
        
        <p>This OTP is valid for a limited time. Please do not share it with anyone.</p>
        
        <p>If you did not request a password reset, you can safely ignore this email.</p>
        
        <p>Best regards,<br>FireTrack360 Support Team</p>
    `;

    return this.createEmailTemplate('Password Reset Request', content);
  }

  /**
   * Generate two-factor authentication email template
   * @param email Recipient's email address
   * @param otp One-time password
   * @returns HTML email template
   */
  generateTwoFactorAuthEmailTemplate(email: string, otp: string): string {
    const content = `
        <p>Hello,</p>
        
        <p>We received a request for two-factor authentication for the account associated with ${email}. 
        Please use the following One-Time Password (OTP) to complete your login:</p>
        
        <div class="otp-code">${otp}</div>
        
        <p>This OTP is valid for a limited time. Do not share this code with anyone.</p>
        
        <p>If you did not initiate this login, please contact our support team immediately.</p>
        
        <p>Best regards,<br>FireTrack360 Security Team</p>
    `;

    return this.createEmailTemplate('Two-Factor Authentication', content);
  }
}

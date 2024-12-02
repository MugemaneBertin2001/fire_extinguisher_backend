import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailTemplateService {
  generateVerificationEmailTemplate(otp: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to FireTrack360</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f4f4f4;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
        }
        .otp-code {
            background-color: #007bff;
            color: white;
            display: inline-block;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 24px;
            margin: 20px 0;
            letter-spacing: 3px;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to FireTrack360</h1>
        <p>Thank you for signing up! To verify your email, please use the following One-Time Password (OTP):</p>
        
        <div class="otp-code">${otp}</div>
        
        <p>This OTP will expire in {10 minutes}. Do not share this code with anyone.</p>
        
        <p>If you did not request this verification, please ignore this email.</p>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} FireTrack360. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate the confirmation email template after successful verification
   * @param name Name of the user for personalized email
   * @returns The HTML email template for confirmation
   */
  generateConfirmationEmailTemplate(name: string): string {
    return `
      <html>
        <body>
          <h2>Congratulations, ${name}!</h2>
          <p>Your email address has been successfully verified with FireTrack360.</p>
          <p>Thank you for registering with us. You can now start using our platform.</p>
        </body>
      </html>
    `;
  }
}

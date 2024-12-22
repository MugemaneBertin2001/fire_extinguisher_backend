import { Injectable, Logger } from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { catchError, timeout, retry } from 'rxjs/operators';
import { AxiosError } from 'axios';

interface EmailJob {
  to: string;
  subject: string;
  text: string;
  attempts?: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name, { timestamp: true });
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 5000; // 5 seconds
  private readonly EMAIL_BATCH_SIZE = 10;

  constructor(
    private readonly httpService: HttpService,
    private readonly emailTemplateService: EmailTemplateService,
    @InjectQueue('USER_EMAILS_QUEUE') private readonly emailQueue: Queue,
  ) {
    this.setupQueueProcessors();
  }

  private setupQueueProcessors() {
    this.emailQueue.process(this.EMAIL_BATCH_SIZE, async (job) => {
      const { to, subject, text, attempts = 0 } = job.data as EmailJob;
      
      try {
        await this.sendEmailWithRetry(to, subject, text, attempts);
        return { success: true, to, subject };
      } catch (error) {
        const shouldRetry = attempts < this.MAX_RETRIES;
        if (shouldRetry) {
          await this.emailQueue.add(
            { to, subject, text, attempts: attempts + 1 },
            { 
              delay: this.getRetryDelay(attempts),
              priority: this.getRetryPriority(attempts)
            }
          );
        } else {
          this.logger.error(
            `Failed to send email to ${to} after ${this.MAX_RETRIES} attempts: ${error.message}`,
            error.stack
          );
        }
        throw error;
      }
    });

    // Handle failed jobs
    this.emailQueue.on('failed', (job, error) => {
      const { to, subject } = job.data as EmailJob;
      this.logger.error(
        `Email job failed for ${to} with subject "${subject}": ${error.message}`,
        error.stack
      );
    });
  }

  private getRetryDelay(attempt: number): number {
    // Exponential backoff: 2^attempt * 1000ms
    return Math.min(Math.pow(2, attempt) * 1000, 30000); // Max 30 seconds
  }

  private getRetryPriority(attempt: number): number {
    // Lower priority for retry attempts
    return 10 - attempt;
  }

  private async sendEmailWithRetry(
    to: string,
    subject: string,
    text: string,
    attempts: number
  ): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          process.env.EMAIL_API_URL,
          { to, subject, text },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Retry-Attempt': attempts.toString(),
            },
          }
        ).pipe(
          timeout(this.TIMEOUT_MS),
          retry(2),
          catchError((error: AxiosError) => {
            const errorMessage = this.getErrorMessage(error);
            throw new Error(`Email sending failed: ${errorMessage}`);
          })
        )
      );

      if (response.status === 200) {
        this.logger.log(
          `Email sent successfully to ${to} with subject "${subject}" (attempt ${attempts + 1})`
        );
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      this.logger.warn(
        `Attempt ${attempts + 1} failed for email to ${to}: ${error.message}`
      );
      throw error;
    }
  }

  private getErrorMessage(error: AxiosError): string {
    if (error.response) {
      return `Server responded with status ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      return 'No response received from server';
    } else {
      return error.message;
    }
  }

  private async queueEmail(job: EmailJob): Promise<void> {
    try {
      await this.emailQueue.add(job, {
        priority: 1,
        attempts: this.MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
    } catch (error) {
      this.logger.error(
        `Failed to queue email to ${job.to}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async sendVerificationEmail(to: string, otp: string): Promise<void> {
    const text = this.emailTemplateService.generateVerificationEmailTemplate(otp);
    await this.queueEmail({
      to,
      subject: 'Verify Your Email - FireTrack360',
      text,
    });
  }

  async sendConfirmationEmail(to: string): Promise<void> {
    const text = this.emailTemplateService.generateConfirmationEmailTemplate(to);
    await this.queueEmail({
      to,
      subject: 'Email Successfully Verified - FireTrack360',
      text,
    });
  }

  async sendForgetPasswordEmail(email: string, otp: string): Promise<void> {
    const text = this.emailTemplateService.generateForgetPasswordTemplate(email, otp);
    await this.queueEmail({
      to: email,
      subject: 'Password Reset Request',
      text,
    });
  }

  async sendTwoFactorAuthEmail(email: string, otp: string): Promise<void> {
    const text = this.emailTemplateService.generateTwoFactorAuthEmailTemplate(email, otp);
    await this.queueEmail({
      to: email,
      subject: 'Two-Factor Authentication Code',
      text,
    });
  }
}
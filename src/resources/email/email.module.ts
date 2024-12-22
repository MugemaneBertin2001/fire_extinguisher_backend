import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get('HTTP_TIMEOUT', 5000),
        maxRedirects: 5,
        headers: {
          'Content-Type': 'application/json',
        },
        retry: {
          retries: 3,
          delay: 1000,
          maxDelay: 5000,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'USER_EMAILS_QUEUE',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
        priority: 1,
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      },
      settings: {
        stalledInterval: 30000,
        maxStalledCount: 3,
      },
      limiter: {
        max: 100,
        duration: 60000,
      },
    }),
  ],
  providers: [
    EmailService, 
    EmailTemplateService,
    ConfigService,
  ],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}
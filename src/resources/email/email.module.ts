import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { HttpModule, HttpService } from '@nestjs/axios';

@Module({
  imports:[HttpModule],
  providers: [EmailService, EmailTemplateService],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppResolver } from './AppResolver';
import { DatabaseModule } from './resources/database/database.module';
import { UserModule } from './resources/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { GqlModule } from './resources/graphql/graphql.module';
import { EmailModule } from './resources/email/email.module';
import { HealthModule } from './health/health.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    UserModule,
    GqlModule,
    ConfigModule.forRoot(),
    EmailModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'Pwd4329uskbfsbjsvbdv',
      },
    }),
    ConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}

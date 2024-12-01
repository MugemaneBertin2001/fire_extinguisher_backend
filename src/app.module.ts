import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppResolver } from './AppResolver';
import { DatabaseModule } from './resources/database/database.module';
import { UserModule } from './resources/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { GqlModule } from './resources/graphql/graphql.module';

@Module({
  imports: [
    DatabaseModule,
    UserModule,
    GqlModule,
    ConfigModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}

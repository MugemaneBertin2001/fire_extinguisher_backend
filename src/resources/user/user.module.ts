import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from './user.repository';
import { User } from './entities/user.entity';
import { DatabaseModule } from '../database/database.module';
import { DataSource } from 'typeorm';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { HashingService } from './hashing.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([User]), EmailModule],
  providers: [
    {
      provide: UserRepository,
      useFactory: (dataSource: DataSource) => {
        return new UserRepository(dataSource);
      },
      inject: [DataSource],
    },
    UserService,
    HashingService,
    UserResolver,
  ],
  exports: [UserService,HashingService, UserRepository],
})
export class UserModule {}

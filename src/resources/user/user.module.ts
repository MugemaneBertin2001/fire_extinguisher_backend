import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { UserRepository } from './user.repository';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { HashingService } from './hashing.service';
import { AuthJwtService } from './jwt.service';
import type { RedisClientOptions } from 'redis';
import redisStore from 'cache-manager-redis-store';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { JwtModule } from '@nestjs/jwt';
import { UserResolver } from './user.resolver';
import { DataSource } from 'typeorm';
import { Queue } from 'bull';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
    EmailModule,
    JwtModule,
    BullModule.registerQueue({
      name: 'USER_EMAILS_QUEUE',
    }),
    CacheModule.registerAsync<RedisClientOptions>({
      useFactory: () => ({
        store: redisStore,
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || 'Pwd4329uskbfsbjsvbdv',
        },
        ttl: parseInt(process.env.REDIS_TTL || '3600'),
      }),
    }),
  ],
  providers: [
    {
      provide: UserRepository,
      useFactory: (dataSource: DataSource, cacheManager: Cache) => {
        const userRepository = dataSource.getRepository(User);
        return new UserRepository(dataSource, userRepository, cacheManager);
      },
      inject: [DataSource, 'CACHE_MANAGER'],
    },
    UserService,
    HashingService,
    UserResolver,
    AuthJwtService,
    Logger,
    {
      provide: 'USER_QUEUE',
      useFactory: (queue: Queue) => queue,
      inject: ['BullQueue_USER_EMAILS_QUEUE'],
    },
  ],
  exports: [UserService, HashingService, UserRepository, AuthJwtService],
})
export class UserModule {}
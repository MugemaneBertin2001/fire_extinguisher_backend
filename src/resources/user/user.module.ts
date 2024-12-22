import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { UserRepository } from './user.repository';
import { User } from './entities/user.entity';
import { DatabaseModule } from '../database/database.module';
import { DataSource } from 'typeorm';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { HashingService } from './hashing.service';
import { EmailModule } from '../email/email.module';
import { AuthJwtService } from './jwt.service';
import { JwtModule } from '@nestjs/jwt';
import type { RedisClientOptions } from 'redis';
import redisStore  from 'cache-manager-redis-store';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
    EmailModule,
    JwtModule,
    CacheModule.registerAsync<RedisClientOptions>({
      useFactory: () => ({
        store: redisStore,
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
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
  ],
  exports: [UserService, HashingService, UserRepository, AuthJwtService],
})
export class UserModule {}
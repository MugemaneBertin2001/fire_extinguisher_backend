import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const isProd = configService.get('NODE_ENV') === 'production';
        return {
          type: 'mysql',
          host: configService.get('DB_HOST', 'localhost'),
          port: parseInt(configService.get<string>('DB_PORT', '3306'), 10),
          username: configService.get('DB_USERNAME', 'root'),
          password: configService.get('DB_PASSWORD', 'password'),
          database: configService.get('DB_NAME', 'fire_extinguisher_db'),
          synchronize: true,
          logging: !isProd,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          extra: {
            charset: 'utf8mb4_unicode_ci',
          },
        };
      },
    }),
  ],
  providers: [],
  exports: [],
})
export class DatabaseModule {}

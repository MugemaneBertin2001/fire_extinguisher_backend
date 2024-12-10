import { logger } from 'src/utils/logger';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseProviders = [
  {
    provide: DataSource,
    useFactory: async (configService: ConfigService) => {
      const isProd = configService.get('NODE_ENV') === 'production';

      const dataSource = new DataSource({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '3306'), 10),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', 'password'),
        database: configService.get<string>('DB_NAME', 'fire_extinguisher_db'),
        synchronize: !isProd, 
        logging: !isProd, 
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        extra: {
          charset: 'utf8mb4_unicode_ci',
        },
      });

      try {
        await dataSource.initialize();
        logger.info('✅ Database connection initialized successfully');
        return dataSource;
      } catch (error) {
        logger.error('❌ Database initialization failed', { error });
        process.exit(1); 
      }
    },
    inject: [ConfigService],
  },
];

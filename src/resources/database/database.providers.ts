import { logger } from 'src/utils/logger';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseProviders = [
  {
    provide: DataSource,
    useFactory: async (configService: ConfigService) => {
      const dataSource = new DataSource({
        type: 'mysql',
        host: configService.get('DB_HOST') || 'localhost',
        port: configService.get('DB_PORT')
          ? parseInt(configService.get('DB_PORT'), 10)
          : 3306,
        username: configService.get('DB_USERNAME') || 'root',
        password: configService.get('DB_PASSWORD') || 'password',
        database: configService.get('DB_NAME') || 'fire_extinguisher_db',
        synchronize: true,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      });

      try {
        await dataSource.initialize();
        logger.info('Database connection initialized');
        return dataSource;
      } catch (error) {
        logger.error('Database initialization failed', error);
      }
    },
    inject: [ConfigService],
  },
];

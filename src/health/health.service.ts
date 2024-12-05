import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class HealthService {
  async serverHealth(): Promise<HealthIndicatorResult> {
    const isHealthy = true; 
    return {
      server: {
        status: isHealthy ? 'up' : 'down',
        details: {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      },
    };
  }
}

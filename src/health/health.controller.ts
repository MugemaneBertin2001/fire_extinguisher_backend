import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.healthService.serverHealth(),

      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024),

      () =>
        this.disk.checkStorage('disk', {
          thresholdPercent: 0.5,
          path: process.cwd(),
        }),
    ]);
  }
}

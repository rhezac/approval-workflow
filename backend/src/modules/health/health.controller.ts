import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorator';
import { DataSource } from 'typeorm';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(private dataSource: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'System Health & Database Connection Diagnostic Endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Service is running healthy and database connection is responsive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-08-30T10:00:00.000Z' },
        uptime: { type: 'number', example: 1420.5 },
        database: { type: 'string', example: 'up' },
        environment: { type: 'string', example: 'development' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service Unavailable - Database connection down or degraded',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'degraded' },
        database: { type: 'string', example: 'down' },
      },
    },
  })
  async check() {
    let dbStatus = 'down';
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'up';
      }
    } catch (e) {
      dbStatus = 'down';
    }

    return {
      status: dbStatus === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

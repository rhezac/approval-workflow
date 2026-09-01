import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { User, Task, TaskApproval, ApprovalWorkflow, ApprovalDelegation, TaskHistory } from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ComboboxModule } from './modules/combobox/combobox.module';
import { HealthModule } from './modules/health/health.module';

import { CombinedAuthGuard } from './modules/auth/guards/combined-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DatabaseSeederService } from './database-seeder.service';
import { decryptValue } from './common/crypto-helper';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const rawPassword = configService.get<string>('DB_PASSWORD', 'password');
        const decryptedPassword = decryptValue(rawPassword);

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: decryptedPassword,
          database: configService.get<string>('DB_DATABASE', 'approval_workflow_db'),
          entities: [User, Task, TaskApproval, ApprovalWorkflow, ApprovalDelegation, TaskHistory],
          synchronize: true, // Auto migration for development
          logging: false,
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, ApprovalWorkflow]),
    AuthModule,
    UsersModule,
    WorkflowsModule,
    TasksModule,
    ComboboxModule,
    HealthModule,
  ],
  providers: [
    DatabaseSeederService,
    {
      provide: APP_GUARD,
      useClass: CombinedAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

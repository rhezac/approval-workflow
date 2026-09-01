import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task, TaskApproval, ApprovalWorkflow, User, ApprovalDelegation, TaskHistory } from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskApproval,
      ApprovalWorkflow,
      User,
      ApprovalDelegation,
      TaskHistory,
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

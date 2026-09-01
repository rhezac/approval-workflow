import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { ApprovalWorkflow } from '../../entities/approval-workflow.entity';
import { Task } from '../../entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApprovalWorkflow, Task])],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}

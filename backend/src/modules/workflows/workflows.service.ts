import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalWorkflow } from '../../entities/approval-workflow.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';
import { AuditLogger } from '../../common/audit/audit-logger';

/**
 * ============================================================================
 * WORKFLOW SERVICE: Approval Workflow Blueprint Management & Versioning
 * ============================================================================
 * 
 * DESIGN PRINCIPLES:
 * 1. Blueprint vs Snapshot:
 *    - ApprovalWorkflow acts as the master template.
 *    - When a task is created, its workflow steps are snapshot-copied into
 *      `task.snapshotWorkflowSteps` to ensure existing tasks remain immutable
 *      even if the template is edited or versioned later.
 * 
 * 2. Protection against Deletion / Deactivation:
 *    - Workflows linked to open tasks (PENDING, IN_PROGRESS, REVISION) CANNOT
 *      be deleted to protect business operations and audit trails.
 * 
 * 3. Step Order Integrity:
 *    - Steps are normalized and strictly sorted by `stepOrder` ascending (1, 2, 3...).
 * ============================================================================
 */

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(ApprovalWorkflow)
    private workflowRepository: Repository<ApprovalWorkflow>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async findAll(onlyActive: boolean = false) {
    const qb = this.workflowRepository.createQueryBuilder('wf')
      .leftJoinAndSelect('wf.createdBy', 'createdBy')
      .orderBy('wf.createdAt', 'DESC');

    if (onlyActive) {
      qb.where('wf.isActive = :isActive', { isActive: true });
    }
    return qb.getMany();
  }

  async findById(id: string): Promise<ApprovalWorkflow> {
    const wf = await this.workflowRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!wf) {
      throw new NotFoundException(`Approval Workflow with ID "${id}" not found`);
    }
    return wf;
  }

  async create(createDto: CreateWorkflowDto, currentUser: any, ip: string): Promise<ApprovalWorkflow> {
    const sortedSteps = [...createDto.steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const wf = this.workflowRepository.create({
      name: createDto.name,
      description: createDto.description,
      version: 1,
      isActive: true,
      steps: sortedSteps,
      createdBy: currentUser?.id ? { id: currentUser.id } as any : null,
    });

    const saved = await this.workflowRepository.save(wf);

    AuditLogger.logAsync({
      who: {
        userId: currentUser?.id,
        username: currentUser?.username,
        role: currentUser?.role,
      },
      what: {
        action: 'CREATE_WORKFLOW',
        resource: 'APPROVAL_WORKFLOW',
        resourceId: saved.id,
        newState: saved,
      },
      where: { ip },
    });

    return saved;
  }

  async update(id: string, updateDto: UpdateWorkflowDto, currentUser: any, ip: string): Promise<ApprovalWorkflow> {
    const wf = await this.findById(id);
    const previousState = { ...wf };

    if (updateDto.name !== undefined) wf.name = updateDto.name;
    if (updateDto.description !== undefined) wf.description = updateDto.description;
    if (updateDto.isActive !== undefined) wf.isActive = updateDto.isActive;

    // Increment version when steps are modified to guarantee versioning immutability for existing tasks
    if (updateDto.steps && updateDto.steps.length > 0) {
      wf.steps = [...updateDto.steps].sort((a, b) => a.stepOrder - b.stepOrder);
      wf.version = (wf.version || 1) + 1;
    }

    const updated = await this.workflowRepository.save(wf);

    AuditLogger.logAsync({
      who: {
        userId: currentUser?.id,
        username: currentUser?.username,
        role: currentUser?.role,
      },
      what: {
        action: 'UPDATE_WORKFLOW',
        resource: 'APPROVAL_WORKFLOW',
        resourceId: updated.id,
        previousState,
        newState: updated,
      },
      where: { ip },
    });

    return updated;
  }

  async remove(id: string, currentUser: any, ip: string): Promise<void> {
    const wf = await this.findById(id);

    // Check if there are active / incomplete tasks associated with this workflow
    const activeTasksCount = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.workflow_id = :wfId', { wfId: id })
      .andWhere('task.status IN (:...openStatuses)', {
        openStatuses: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.REVISION],
      })
      .getCount();

    if (activeTasksCount > 0) {
      throw new BadRequestException(
        `Cannot delete workflow "${wf.name}". There are currently ${activeTasksCount} active/incomplete tasks (pending/in-progress/revision) still linked to this workflow. Please complete or cancel those tasks first, or deactivate (set inactive) this workflow instead.`,
      );
    }

    await this.workflowRepository.remove(wf);

    AuditLogger.logAsync({
      who: {
        userId: currentUser?.id,
        username: currentUser?.username,
        role: currentUser?.role,
      },
      what: {
        action: 'DELETE_WORKFLOW',
        resource: 'APPROVAL_WORKFLOW',
        resourceId: id,
      },
      where: { ip },
    });
  }
}

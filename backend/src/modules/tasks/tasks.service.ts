import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  Task,
  TaskStatus,
  User,
  RoleEnum,
  DivisionEnum,
  ApprovalWorkflow,
  TaskApproval,
  ApprovalAction,
  ApprovalDelegation,
  TaskHistory,
  TaskHistoryAction,
} from '../../entities';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import {
  ProcessApprovalDto,
  ApprovalDecisionEnum,
  CancelTaskDto,
  ReassignApprovalDto,
  CreateDelegationDto,
  UpdateDelegationDto,
} from './dto/approval-action.dto';
import { AuditLogger } from '../../common/audit/audit-logger';
import { formatDateString } from '../../common/date-helper';

/**
 * ============================================================================
 * ARCHITECTURE OVERVIEW: Task Management & Sequential Approval Workflow Engine
 * ============================================================================
 * 
 * CORE DOMAIN CONCEPTS:
 * 1. Sequential Multi-Level Pipeline:
 *    - Tasks progress sequentially from Stage 1 -> Stage 2 -> Stage N.
 *    - Level progression is atomic: a task cannot advance to Level N+1 until ALL
 *      required approver units in Level N are completely satisfied.
 * 
 * 2. Approver Unit Models (per Level):
 *    - ROLE_DIVISION: Evaluated dynamically against user roles and divisions.
 *    - SPECIFIC_USER: Explicit direct user assignment.
 *    - MULTI_USER_OPTION (Logic OR): A pool of candidate approvers where approval
 *      by ANY 1 candidate immediately fulfills the unit and marks counterpart
 *      records as Completed.
 * 
 * 3. Step Level Isolation:
 *    - Approvals are strictly bounded to `task.currentStepOrder`. A user assigned to
 *      Level 1 and Level 2 must approve Level 1 first; Level 2 is only opened once
 *      Stage 1 has passed.
 * 
 * 4. Delegation & Security:
 *    - Approvers may delegate authority to colleagues holding the exact same role.
 *    - Tasks are protected against self-approval (creators cannot approve own tasks).
 *    - Active workflows associated with open tasks are protected against deletion.
 * ============================================================================
 */

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ApprovalWorkflow)
    private workflowRepository: Repository<ApprovalWorkflow>,
    @InjectRepository(TaskApproval)
    private taskApprovalRepository: Repository<TaskApproval>,
    @InjectRepository(ApprovalDelegation)
    private delegationRepository: Repository<ApprovalDelegation>,
    @InjectRepository(TaskHistory)
    private historyRepository: Repository<TaskHistory>,
  ) {}

  /**
   * Helper to check active delegations for an approver (including date bounds)
   */
  async getActiveDelegations(userId: string): Promise<ApprovalDelegation[]> {
    const today = new Date().toISOString().split('T')[0];
    const delegations = await this.delegationRepository.find({
      where: {
        delegatee: { id: userId },
        isActive: true,
      },
      relations: ['delegator'],
    });

    return delegations.filter((d) => {
      const start = formatDateString(d.startDate);
      const end = formatDateString(d.endDate);
      return start <= today && end >= today;
    });
  }

  /**
   * Helper to check active delegation for an approver
   */
  async getEffectiveApproverIds(userId: string): Promise<string[]> {
    const activeDelegations = await this.getActiveDelegations(userId);
    const activeDelegatorIds = activeDelegations.map((d) => d.delegator.id);
    return [userId, ...activeDelegatorIds];
  }

  /**
   * List tasks with Role-Based Visibility
   */
  async findAll(currentUser: any, query?: { status?: string; division?: string; search?: string }) {
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.workflow', 'workflow')
      .leftJoinAndSelect('task.approvals', 'approvals')
      .leftJoinAndSelect('approvals.assignedApprover', 'assignedApprover')
      .leftJoinAndSelect('approvals.actualApprover', 'actualApprover')
      .orderBy('task.createdAt', 'DESC');

    if (query?.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }
    if (query?.division) {
      qb.andWhere('task.division = :division', { division: query.division });
    }
    if (query?.search) {
      qb.andWhere('(task.title ILIKE :search OR task.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    // Role-based visibility logic per doc & delegation:
    // - Admin: see all tasks
    // - Staff: only see own tasks
    // - Manager: see own tasks + tasks of staff with SAME division + active delegated open tasks
    // - Direktur: see own tasks + tasks waiting for their approval / all in director flow + active delegated tasks
    const activeDelegations = await this.getActiveDelegations(currentUser.id);
    const effectiveApproverIds = [currentUser.id, ...activeDelegations.map((d) => d.delegator.id)];

    if (currentUser.role === RoleEnum.ADMIN || currentUser.isApiKey) {
      // Admin sees all
    } else if (currentUser.role === RoleEnum.STAFF) {
      // Staff sees:
      // 1. Own created tasks
      // 2. Tasks where this staff is explicitly assigned as an approver (Specific User or Multi-User Choice)
      // 3. Tasks delegated to this staff (if applicable)
      if (activeDelegations.length > 0) {
        const delegatorIds = activeDelegations.map((d) => d.delegator.id);
        qb.andWhere(
          '(task.creator_id = :creatorId OR assignedApprover.id = :currentUserId OR (assignedApprover.id IN (:...delegatorIds) AND task.status IN (:...openStatuses)))',
          {
            creatorId: currentUser.id,
            currentUserId: currentUser.id,
            delegatorIds,
            openStatuses: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.REVISION],
          },
        );
      } else {
        qb.andWhere(
          '(task.creator_id = :creatorId OR assignedApprover.id = :currentUserId)',
          {
            creatorId: currentUser.id,
            currentUserId: currentUser.id,
          },
        );
      }
    } else if (currentUser.role === RoleEnum.MANAGER || currentUser.role === RoleEnum.LEADER || currentUser.role === RoleEnum.HEAD_OF_DIVISION) {
      if (activeDelegations.length > 0) {
        // Base visibility: own tasks, same division, OR assigned approver
        // Delegated visibility: tasks assigned to delegators that are currently open (PENDING/IN_PROGRESS/REVISION)
        const delegatorIds = activeDelegations.map((d) => d.delegator.id);
        qb.andWhere(
          '(task.creator_id = :creatorId OR task.division = :division OR assignedApprover.id = :currentUserId OR (assignedApprover.id IN (:...delegatorIds) AND task.status IN (:...openStatuses)))',
          {
            creatorId: currentUser.id,
            division: currentUser.division,
            currentUserId: currentUser.id,
            delegatorIds,
            openStatuses: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.REVISION],
          },
        );
      } else {
        qb.andWhere(
          '(task.creator_id = :creatorId OR task.division = :division OR assignedApprover.id = :currentUserId)',
          {
            creatorId: currentUser.id,
            division: currentUser.division,
            currentUserId: currentUser.id,
          },
        );
      }
    } else if (currentUser.role === RoleEnum.DIREKTUR) {
      if (activeDelegations.length > 0) {
        const delegatorIds = activeDelegations.map((d) => d.delegator.id);
        qb.andWhere(
          '(task.creator_id = :creatorId OR task.status IN (:...visibleStatuses) OR assignedApprover.id = :currentUserId OR (assignedApprover.id IN (:...delegatorIds) AND task.status IN (:...openStatuses)))',
          {
            creatorId: currentUser.id,
            visibleStatuses: [TaskStatus.IN_PROGRESS, TaskStatus.PENDING, TaskStatus.APPROVED, TaskStatus.REJECTED, TaskStatus.REVISION],
            currentUserId: currentUser.id,
            delegatorIds,
            openStatuses: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.REVISION],
          },
        );
      } else {
        qb.andWhere(
          '(task.creator_id = :creatorId OR task.status IN (:...visibleStatuses) OR assignedApprover.id = :currentUserId)',
          {
            creatorId: currentUser.id,
            visibleStatuses: [TaskStatus.IN_PROGRESS, TaskStatus.PENDING, TaskStatus.APPROVED, TaskStatus.REJECTED, TaskStatus.REVISION],
            currentUserId: currentUser.id,
          },
        );
      }
    }

    const tasks = await qb.getMany();

    // Attach computed boolean `canApprove` for the current user
    return tasks.map((task) => this.enrichTaskWithPermissions(task, currentUser, effectiveApproverIds, activeDelegations));
  }

  async findById(id: string, currentUser: any): Promise<any> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: [
        'creator',
        'workflow',
        'approvals',
        'approvals.assignedApprover',
        'approvals.actualApprover',
        'histories',
        'histories.actor',
        'histories.targetUser',
      ],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    // Sort histories chronologically
    if (task.histories) {
      task.histories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    // Check visibility permissions
    const activeDelegations = await this.getActiveDelegations(currentUser.id);
    const effectiveApproverIds = [currentUser.id, ...activeDelegations.map((d) => d.delegator.id)];

    // Check direct assignment
    const isDirectAssigned = (task.approvals || []).some(
      (a) => a.assignedApprover && a.assignedApprover.id === currentUser.id,
    );

    // Check valid delegated assignment (Open status during active delegation)
    const isDelegatedAssigned = (task.approvals || []).some((a) => {
      if (!a.assignedApprover) return false;
      const matchingDelegation = activeDelegations.find((d) => d.delegator.id === a.assignedApprover.id);
      if (!matchingDelegation) return false;

      const isOpenStatus = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.REVISION].includes(task.status);
      return isOpenStatus;
    });

    if (
      currentUser.role !== RoleEnum.ADMIN &&
      !currentUser.isApiKey &&
      task.creator?.id !== currentUser.id &&
      !isDirectAssigned &&
      !isDelegatedAssigned
    ) {
      if (currentUser.role === RoleEnum.STAFF) {
        throw new ForbiddenException('You are not authorized to view this task');
      }
      if (
        (currentUser.role === RoleEnum.MANAGER || currentUser.role === RoleEnum.LEADER || currentUser.role === RoleEnum.HEAD_OF_DIVISION) &&
        task.division !== currentUser.division
      ) {
        throw new ForbiddenException('You cannot view tasks outside your division');
      }
    }

    return this.enrichTaskWithPermissions(task, currentUser, effectiveApproverIds, activeDelegations);
  }

  private enrichTaskWithPermissions(
    task: Task,
    currentUser: any,
    effectiveApproverIds: string[],
    activeDelegations: ApprovalDelegation[] = [],
  ): any {
    // Document rule:
    // "Tombol approval hanya keluar pada task untuk user yang memiliki keharusan untuk approval.
    // Jika task sendiri tombol approval tidak keluar"
    const isOwnTask = task.creator?.id === currentUser?.id;
    let canApprove = false;
    let currentPendingApproval: TaskApproval | null = null;

    if (!isOwnTask && (task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REVISION)) {
      // Find approvals in current step
      const currentStepApprovals = (task.approvals || []).filter(
        (a) => a.stepOrder === task.currentStepOrder && a.action === ApprovalAction.PENDING,
      );

      const taskDate = new Date(task.createdAt).toISOString().split('T')[0];

      // Check if current user or delegators match assigned approver, or Admin override
      for (const app of currentStepApprovals) {
        if (!app.assignedApprover) continue;

        // Admin override
        if (currentUser.role === RoleEnum.ADMIN) {
          canApprove = true;
          currentPendingApproval = app;
          break;
        }

        // Direct assignment
        if (app.assignedApprover.id === currentUser.id) {
          canApprove = true;
          currentPendingApproval = app;
          break;
        }

        // Delegated assignment (active delegator on open step)
        const matchingDelegation = activeDelegations.find((d) => d.delegator.id === app.assignedApprover.id);
        if (matchingDelegation) {
          canApprove = true;
          currentPendingApproval = app;
          break;
        }
      }
    }

    return {
      ...task,
      canApprove,
      pendingApprovalId: currentPendingApproval?.id || null,
      isOwnTask,
    };
  }

  async create(createDto: CreateTaskDto, currentUser: any, ip: string): Promise<Task> {
    const division = createDto.division || currentUser.division || DivisionEnum.IT;

    // Pick workflow: either explicitly chosen, or default active workflow
    let workflow: ApprovalWorkflow | null = null;
    if (createDto.workflowId && createDto.workflowId.trim() !== '') {
      workflow = await this.workflowRepository.findOne({ where: { id: createDto.workflowId, isActive: true } });
      if (!workflow) {
        throw new BadRequestException('Specified approval workflow not found or inactive');
      }
    } else {
      // Default: pick first active workflow or create a default if none exists
      workflow = await this.workflowRepository.findOne({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
      if (!workflow) {
        // Create default multi-level workflow (Staff -> Manager -> Direktur)
        workflow = await this.createDefaultWorkflow();
      }
    }

    const newTask = this.taskRepository.create({
      title: createDto.title,
      description: createDto.description,
      priority: createDto.priority,
      division,
      status: TaskStatus.PENDING,
      creator: { id: currentUser.id } as User,
      workflow,
      workflowVersion: workflow.version,
      snapshotWorkflowSteps: workflow.steps, // Snapshot steps at creation time
      currentStepOrder: 1,
      notes: createDto.notes || 'Task created',
      attachments: createDto.attachments || [],
    });

    const savedTask = await this.taskRepository.save(newTask);

    // Record initial Task History: Created
    await this.historyRepository.save(
      this.historyRepository.create({
        task: { id: savedTask.id } as Task,
        action: TaskHistoryAction.CREATED,
        actor: { id: currentUser.id } as User,
        notes: createDto.notes || 'Task created by staff',
      }),
    );

    // Generate step approval records from snapshot
    await this.generateTaskApprovals(savedTask, workflow.steps, division);

    const fullTask = await this.findById(savedTask.id, currentUser);

    AuditLogger.logAsync({
      who: {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        division: currentUser.division,
      },
      what: {
        action: 'CREATE_TASK',
        resource: 'TASK',
        resourceId: fullTask.id,
        newState: {
          id: fullTask.id,
          title: fullTask.title,
          status: fullTask.status,
          workflowVersion: fullTask.workflowVersion,
        },
      },
      where: { ip },
    });

    return fullTask;
  }

  private async generateTaskApprovals(task: Task, steps: any[], taskDivision: DivisionEnum) {
    const approvalsToSave: TaskApproval[] = [];

    for (const step of steps) {
      // 1. If step has granular approverUnits configured (e.g. Manager IT, Manager Fin, staff_fin, & Option(staff_biz, manager_biz))
      if (step.approverUnits && step.approverUnits.length > 0) {
        for (let uIdx = 0; uIdx < step.approverUnits.length; uIdx++) {
          const unit = step.approverUnits[uIdx];
          const unitId = unit.id || `step-${step.stepOrder}-unit-${uIdx + 1}`;
          let unitUsers: User[] = [];

          if (unit.type === 'SPECIFIC_USER' && unit.userId) {
            const u = await this.userRepository.findOne({ where: { id: unit.userId, isActive: true } });
            if (u) unitUsers = [u];
          } else if (unit.type === 'MULTI_USER_OPTION' && unit.userIds && unit.userIds.length > 0) {
            unitUsers = await this.userRepository.find({
              where: { id: In(unit.userIds), isActive: true },
            });
          } else {
            // ROLE_DIVISION
            const qb = this.userRepository.createQueryBuilder('user').where('user.isActive = :active', { active: true });
            if (unit.roleRequired) {
              qb.andWhere('user.role = :role', { role: unit.roleRequired });
            }
            if (unit.divisionRequired === 'SAME_AS_REQUESTER') {
              qb.andWhere('user.division = :div', { div: taskDivision });
            } else if (unit.divisionRequired && unit.divisionRequired !== 'ANY') {
              qb.andWhere('user.division = :div', { div: unit.divisionRequired });
            }
            unitUsers = await qb.getMany();
          }

          // Fallback if no matching user
          if (unitUsers.length === 0) {
            unitUsers = await this.userRepository.find({
              where: { role: RoleEnum.ADMIN, isActive: true },
            });
          }

          const label = unit.label || (unit.type === 'ROLE_DIVISION' ? `${unit.roleRequired || ''} ${unit.divisionRequired || ''}`.trim() : (unit.type === 'SPECIFIC_USER' ? 'Specific User' : 'Multi-User Option'));

          for (const approver of unitUsers) {
            const app = this.taskApprovalRepository.create({
              task: { id: task.id } as Task,
              stepOrder: step.stepOrder,
              stepName: step.name,
              unitId,
              unitLabel: label,
              assignedApprover: approver,
              action: ApprovalAction.PENDING,
            });
            approvalsToSave.push(app);
          }
        }
      } else {
        // 2. Legacy / Direct single-unit step
        let approverUsers: User[] = [];

        if (step.approverUserIds && step.approverUserIds.length > 0) {
          approverUsers = await this.userRepository.find({
            where: { id: In(step.approverUserIds), isActive: true },
          });
        } else {
          const qb = this.userRepository.createQueryBuilder('user').where('user.isActive = :active', { active: true });

          if (step.roleRequired) {
            qb.andWhere('user.role = :role', { role: step.roleRequired });
          }

          if (step.divisionRequired === 'SAME_AS_REQUESTER') {
            qb.andWhere('user.division = :div', { div: taskDivision });
          } else if (step.divisionRequired && step.divisionRequired !== 'ANY') {
            qb.andWhere('user.division = :div', { div: step.divisionRequired });
          }

          approverUsers = await qb.getMany();
        }

        if (approverUsers.length === 0) {
          approverUsers = await this.userRepository.find({
            where: { role: RoleEnum.ADMIN, isActive: true },
          });
        }

        for (const approver of approverUsers) {
          const app = this.taskApprovalRepository.create({
            task: { id: task.id } as Task,
            stepOrder: step.stepOrder,
            stepName: step.name,
            unitId: `step-${step.stepOrder}-default`,
            unitLabel: step.name,
            assignedApprover: approver,
            action: ApprovalAction.PENDING,
          });
          approvalsToSave.push(app);
        }
      }
    }

    if (approvalsToSave.length > 0) {
      await this.taskApprovalRepository.save(approvalsToSave);
    }
  }

  private async createDefaultWorkflow(): Promise<ApprovalWorkflow> {
    const defaultWf = this.workflowRepository.create({
      name: 'Default Multi-Level Approval (Staff -> Manager -> Direktur)',
      description: 'Standard enterprise approval workflow with Any/All logic',
      version: 1,
      isActive: true,
      steps: [
        {
          stepOrder: 1,
          name: 'Manager Approval',
          roleRequired: RoleEnum.MANAGER,
          divisionRequired: 'SAME_AS_REQUESTER',
          logic: 'ANY',
        },
        {
          stepOrder: 2,
          name: 'Direktur Approval',
          roleRequired: RoleEnum.DIREKTUR,
          divisionRequired: 'ANY',
          logic: 'ANY',
        },
      ],
    });
    return this.workflowRepository.save(defaultWf);
  }

  async update(id: string, updateDto: UpdateTaskDto, currentUser: any, ip: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['creator'],
    });
    if (!task) throw new NotFoundException(`Task with ID "${id}" not found`);

    // Only creator or admin can update task before it is final
    if (currentUser.role !== RoleEnum.ADMIN && task.creator?.id !== currentUser.id) {
      throw new ForbiddenException('You can only update your own tasks');
    }

    if (task.status === TaskStatus.APPROVED || task.status === TaskStatus.CANCELED) {
      throw new BadRequestException(`Cannot update task in "${task.status}" status`);
    }

    const previousState = { ...task };

    if (updateDto.title) task.title = updateDto.title;
    if (updateDto.description) task.description = updateDto.description;
    if (updateDto.priority) task.priority = updateDto.priority;
    if (updateDto.division) task.division = updateDto.division;
    if (updateDto.notes) task.notes = updateDto.notes;
    if (updateDto.attachments) task.attachments = updateDto.attachments as any;

    const saved = await this.taskRepository.save(task);

    AuditLogger.logAsync({
      who: {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
      },
      what: {
        action: 'UPDATE_TASK',
        resource: 'TASK',
        resourceId: id,
        previousState,
        newState: saved,
      },
      where: { ip },
    });

    return this.findById(id, currentUser);
  }

  async remove(id: string, currentUser: any, ip: string): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['creator'],
    });
    if (!task) throw new NotFoundException(`Task with ID "${id}" not found`);

    if (currentUser.role !== RoleEnum.ADMIN && task.creator?.id !== currentUser.id) {
      throw new ForbiddenException('You can only delete your own tasks or Admin can delete');
    }

    await this.taskRepository.remove(task);

    AuditLogger.logAsync({
      who: {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
      },
      what: {
        action: 'DELETE_TASK',
        resource: 'TASK',
        resourceId: id,
      },
      where: { ip },
    });
  }

  /**
   * Process Approval Decision (APPROVE / REJECT) with strict authorization check
   */
  async processApproval(
    taskId: string,
    processDto: ProcessApprovalDto,
    currentUser: any,
    ip: string,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['creator', 'approvals', 'approvals.assignedApprover'],
    });

    if (!task) throw new NotFoundException(`Task with ID "${taskId}" not found`);

    // Document rule: "Jika task sendiri tombol approval tidak keluar / Approver tidak boleh bisa approve task yang bukan miliknya"
    if (task.creator?.id === currentUser.id && currentUser.role !== RoleEnum.ADMIN) {
      throw new ForbiddenException('You cannot approve your own task');
    }

    if (task.status === TaskStatus.APPROVED || task.status === TaskStatus.REJECTED || task.status === TaskStatus.CANCELED) {
      throw new BadRequestException(`Task is already in "${task.status}" state and cannot be approved/rejected`);
    }

    const activeDelegations = await this.getActiveDelegations(currentUser.id);
    const effectiveApproverIds = [currentUser.id, ...activeDelegations.map((d) => d.delegator.id)];

    // Find pending approval step record for this user
    const currentStepApprovals = task.approvals.filter(
      (a) => a.stepOrder === task.currentStepOrder && a.action === ApprovalAction.PENDING,
    );

    const taskDate = new Date(task.createdAt).toISOString().split('T')[0];

    // Find valid matching approval
    let matchingApproval: TaskApproval | undefined;

    // 1. Direct assignment
    matchingApproval = currentStepApprovals.find(
      (a) => a.assignedApprover && a.assignedApprover.id === currentUser.id,
    );

    // 2. Delegated assignment (valid for active delegations on open stage)
    if (!matchingApproval) {
      matchingApproval = currentStepApprovals.find((a) => {
        if (!a.assignedApprover) return false;
        const matchingDelegation = activeDelegations.find((d) => d.delegator.id === a.assignedApprover.id);
        return !!matchingDelegation;
      });
    }

    // 3. Admin can act as approver for anyone per requirement: "Admin bisa approve task siapa pun"
    if (!matchingApproval && (currentUser.role === RoleEnum.ADMIN || currentUser.isApiKey)) {
      matchingApproval = currentStepApprovals[0];
    }

    if (!matchingApproval) {
      throw new ForbiddenException(
        'You are not authorized to approve/reject this task at the current stage or outside valid delegation window',
      );
    }

    const previousStatus = task.status;
    const isDelegatedAction = matchingApproval.assignedApprover?.id !== currentUser.id;

    // Update approval item
    if (processDto.decision === ApprovalDecisionEnum.APPROVED) {
      matchingApproval.action = ApprovalAction.APPROVED;
    } else if (processDto.decision === ApprovalDecisionEnum.REVISION) {
      matchingApproval.action = ApprovalAction.REVISION;
    } else {
      matchingApproval.action = ApprovalAction.REJECTED;
    }

    matchingApproval.actualApprover = { id: currentUser.id } as User;
    matchingApproval.actionAt = new Date();
    matchingApproval.notes = processDto.notes || '';
    if (isDelegatedAction) {
      matchingApproval.isDelegated = true;
      matchingApproval.delegatedBy = matchingApproval.assignedApprover;
    }
    await this.taskApprovalRepository.save(matchingApproval);

    // Find step logic: ANY vs ALL from snapshot
    const stepsConfig = task.snapshotWorkflowSteps || [];
    const currentStepConfig: any = stepsConfig.find((s) => s.stepOrder === task.currentStepOrder) || { logic: 'ANY' };

    if (processDto.decision === ApprovalDecisionEnum.REJECTED) {
      task.status = TaskStatus.REJECTED;
      task.notes = processDto.notes ? `Rejected: ${processDto.notes}` : 'Task was rejected';
      await this.taskRepository.save(task);
    } else if (processDto.decision === ApprovalDecisionEnum.REVISION) {
      task.status = TaskStatus.REVISION;
      task.notes = processDto.notes ? `Need Revision: ${processDto.notes}` : 'Task returned for revision';
      await this.taskRepository.save(task);
    } else {
      // It is APPROVED by current approver
      task.status = TaskStatus.IN_PROGRESS; // In progress between levels

      // --------------------------------------------------------------------------
      // MULTI-USER OPTION / LOGIC OR RESOLUTION:
      // When an approver in a Multi-User Choice group approves, immediately
      // resolve all pending counterpart candidate approvals in that same unit
      // to APPROVED with an explanatory note.
      // --------------------------------------------------------------------------
      if (matchingApproval.unitId) {
        await this.taskApprovalRepository
          .createQueryBuilder()
          .update(TaskApproval)
          .set({
            action: ApprovalAction.APPROVED,
            notes: `Completed via approval by ${currentUser.username}`,
            actionAt: new Date(),
          })
          .where('task_id = :taskId', { taskId: task.id })
          .andWhere('stepOrder = :stepOrder', { stepOrder: task.currentStepOrder })
          .andWhere('unitId = :unitId', { unitId: matchingApproval.unitId })
          .andWhere('action = :pendingAction', { pendingAction: ApprovalAction.PENDING })
          .execute();
      } else if (currentStepConfig.logic === 'ANY') {
        // Legacy single-unit step with ANY logic
        await this.taskApprovalRepository
          .createQueryBuilder()
          .update(TaskApproval)
          .set({
            action: ApprovalAction.APPROVED,
            notes: `Completed via approval by ${currentUser.username}`,
            actionAt: new Date(),
          })
          .where('task_id = :taskId', { taskId: task.id })
          .andWhere('stepOrder = :stepOrder', { stepOrder: task.currentStepOrder })
          .andWhere('action = :pendingAction', { pendingAction: ApprovalAction.PENDING })
          .execute();
      }

      // Re-fetch all step approvals from database to get the updated status of siblings
      const allStepApprovals = await this.taskApprovalRepository.find({
        where: { task: { id: task.id }, stepOrder: task.currentStepOrder },
      });

      // --------------------------------------------------------------------------
      // STAGE SATISFACTION EVALUATION:
      // A stage (e.g. Level 1) is satisfied when every single distinct Unit in
      // that stage has at least one APPROVED record (Units are evaluated with AND,
      // while candidates inside a MULTI_USER_OPTION unit are evaluated with OR).
      // --------------------------------------------------------------------------
      const hasGranularUnits = (currentStepConfig.approverUnits && currentStepConfig.approverUnits.length > 0) || allStepApprovals.some((a) => a.unitId);

      let stepPassed = false;

      if (hasGranularUnits) {
        // Collect distinct unitIds in this step
        const distinctUnitIds = Array.from(new Set(allStepApprovals.map((a) => a.unitId).filter(Boolean)));

        if (distinctUnitIds.length > 0) {
          // Every approval unit must have at least 1 APPROVED action
          stepPassed = distinctUnitIds.every((uid) => {
            const unitApprovals = allStepApprovals.filter((a) => a.unitId === uid);
            return unitApprovals.some((a) => a.action === ApprovalAction.APPROVED);
          });
        } else {
          stepPassed = allStepApprovals.some((a) => a.action === ApprovalAction.APPROVED);
        }
      } else {
        if (currentStepConfig.logic === 'ANY') {
          stepPassed = allStepApprovals.some((a) => a.action === ApprovalAction.APPROVED);
        } else {
          // 'ALL' logic: must all be approved
          stepPassed = allStepApprovals.every((a) => a.action === ApprovalAction.APPROVED);
        }
      }

      if (stepPassed) {
        const maxStep = stepsConfig.length > 0 ? Math.max(...stepsConfig.map((s) => s.stepOrder)) : 1;
        if (task.currentStepOrder >= maxStep) {
          // All levels completed!
          task.status = TaskStatus.APPROVED;
          task.notes = processDto.notes ? `Approved: ${processDto.notes}` : 'Task fully approved';
        } else {
          // Advance to next step
          task.currentStepOrder += 1;
          task.notes = `Advanced to step ${task.currentStepOrder}`;
        }
      }
      await this.taskRepository.save(task);
    }

    // Record Task History Entry for Approval/Revision/Rejection
    let historyAction = TaskHistoryAction.APPROVED;
    if (processDto.decision === ApprovalDecisionEnum.REVISION) {
      historyAction = TaskHistoryAction.REVISION_REQUESTED;
    } else if (processDto.decision === ApprovalDecisionEnum.REJECTED) {
      historyAction = TaskHistoryAction.REJECTED;
    }

    await this.historyRepository.save(
      this.historyRepository.create({
        task: { id: task.id } as Task,
        action: historyAction,
        actor: { id: currentUser.id } as User,
        stepOrder: matchingApproval.stepOrder,
        stepName: matchingApproval.stepName,
        notes: processDto.notes || `${processDto.decision} at stage ${matchingApproval.stepName}`,
      }),
    );

    AuditLogger.logAsync({
      who: {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        division: currentUser.division,
      },
      what: {
        action: `TASK_${processDto.decision}`,
        resource: 'TASK_APPROVAL',
        resourceId: matchingApproval.id,
        previousState: { status: previousStatus, stepOrder: matchingApproval.stepOrder },
        newState: {
          status: task.status,
          decision: processDto.decision,
          stepOrder: task.currentStepOrder,
          notes: processDto.notes,
        },
      },
      where: { ip },
    });

    return this.findById(task.id, currentUser);
  }

  /**
   * Submit revision by staff/creator to put task back into approval workflow
   */
  async submitRevision(
    taskId: string,
    revisionDto: any,
    currentUser: any,
    ip: string,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['creator', 'approvals'],
    });

    if (!task) throw new NotFoundException(`Task with ID "${taskId}" not found`);

    if (task.creator?.id !== currentUser.id && currentUser.role !== RoleEnum.ADMIN) {
      throw new ForbiddenException('Only the task creator or Admin can submit revision for this task');
    }

    if (task.status !== TaskStatus.REVISION) {
      throw new BadRequestException('Task is not in revision status');
    }

    const previousState = { ...task };

    if (revisionDto.title) task.title = revisionDto.title;
    if (revisionDto.description) task.description = revisionDto.description;
    if (revisionDto.priority) task.priority = revisionDto.priority;
    if (revisionDto.attachments) task.attachments = revisionDto.attachments as any;
    task.notes = `Revised: ${revisionDto.revisionNotes || 'Revision submitted'}`;
    task.status = TaskStatus.IN_PROGRESS;

    // Reset pending approval records for current/all steps so approvers can re-review
    for (const app of task.approvals) {
      if (app.action === ApprovalAction.REVISION || app.stepOrder >= task.currentStepOrder) {
        app.action = ApprovalAction.PENDING;
        app.actionAt = null;
        app.actualApprover = null;
        await this.taskApprovalRepository.save(app);
      }
    }

    const saved = await this.taskRepository.save(task);

    // Record Task History: Revision Submitted
    await this.historyRepository.save(
      this.historyRepository.create({
        task: { id: taskId } as Task,
        action: TaskHistoryAction.REVISION_SUBMITTED,
        actor: { id: currentUser.id } as User,
        stepOrder: task.currentStepOrder,
        notes: revisionDto.revisionNotes || 'Revision submitted by staff',
      }),
    );

    AuditLogger.logAsync({
      who: {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
      },
      what: {
        action: 'SUBMIT_TASK_REVISION',
        resource: 'TASK',
        resourceId: taskId,
        previousState,
        newState: {
          status: saved.status,
          notes: saved.notes,
        },
      },
      where: { ip },
    });

    return this.findById(taskId, currentUser);
  }

  /**
   * Cancel task
   */
  async cancelTask(taskId: string, cancelDto: CancelTaskDto, currentUser: any, ip: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['creator'],
    });

    if (!task) throw new NotFoundException(`Task with ID "${taskId}" not found`);

    if (currentUser.role !== RoleEnum.ADMIN && task.creator?.id !== currentUser.id) {
      throw new ForbiddenException('Only task creator or Admin can cancel this task');
    }

    const previousStatus = task.status;
    task.status = TaskStatus.CANCELED;
    task.notes = `Canceled: ${cancelDto.notes}`;
    await this.taskRepository.save(task);

    // Record Task History: Canceled
    await this.historyRepository.save(
      this.historyRepository.create({
        task: { id: taskId } as Task,
        action: TaskHistoryAction.CANCELED,
        actor: { id: currentUser.id } as User,
        notes: cancelDto.notes ? `Task canceled: ${cancelDto.notes}` : 'Task canceled',
      }),
    );

    AuditLogger.logAsync({
      who: {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
      },
      what: {
        action: 'CANCEL_TASK',
        resource: 'TASK',
        resourceId: taskId,
        previousState: { status: previousStatus },
        newState: { status: task.status, notes: cancelDto.notes },
      },
      where: { ip },
    });

    return this.findById(taskId, currentUser);
  }

  /**
   * Reassign Approval (Admin feature)
   */
  async reassignApproval(
    approvalId: string,
    reassignDto: ReassignApprovalDto,
    currentUser: any,
    ip: string,
  ): Promise<TaskApproval> {
    const approval = await this.taskApprovalRepository.findOne({
      where: { id: approvalId },
      relations: ['assignedApprover', 'task'],
    });

    if (!approval) throw new NotFoundException(`Task approval with ID "${approvalId}" not found`);

    const newApprover = await this.userRepository.findOne({
      where: { id: reassignDto.newApproverId, isActive: true },
    });
    if (!newApprover) throw new NotFoundException(`New Approver user not found`);

    const previousApprover = approval.assignedApprover;
    approval.assignedApprover = newApprover;
    approval.isReassigned = true;
    approval.reassignedBy = { id: currentUser.id } as User;
    if (reassignDto.notes) approval.notes = reassignDto.notes;

    const saved = await this.taskApprovalRepository.save(approval);

    // Record Task History: Reassigned
    await this.historyRepository.save(
      this.historyRepository.create({
        task: { id: approval.task.id } as Task,
        action: TaskHistoryAction.REASSIGNED,
        actor: { id: currentUser.id } as User,
        targetUser: newApprover,
        stepOrder: approval.stepOrder,
        stepName: approval.stepName,
        notes: reassignDto.notes
          ? `Reassigned from ${previousApprover?.username || 'Previous'} to ${newApprover.username}: ${reassignDto.notes}`
          : `Reassigned from ${previousApprover?.username || 'Previous'} to ${newApprover.username}`,
      }),
    );

    AuditLogger.logAsync({
      who: {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
      },
      what: {
        action: 'REASSIGN_APPROVAL',
        resource: 'TASK_APPROVAL',
        resourceId: approvalId,
        previousState: { assignedApprover: previousApprover?.username },
        newState: { assignedApprover: newApprover.username, notes: reassignDto.notes },
      },
      where: { ip },
    });

    return saved;
  }

  /**
   * Create delegation (Approver can delegate to another user of the same role when on leave)
   */
  async createDelegation(dto: CreateDelegationDto, currentUser: any, ip: string): Promise<ApprovalDelegation> {
    const delegatee = await this.userRepository.findOne({
      where: { id: dto.delegateeId, isActive: true },
    });
    if (!delegatee) throw new NotFoundException('Delegatee user not found');

    if (delegatee.id === currentUser.id) {
      throw new BadRequestException('Cannot delegate approval to yourself');
    }

    // Role validation: delegatee must have the same role (e.g., Manager -> Manager, Direktur -> Direktur)
    if (currentUser.role !== RoleEnum.ADMIN && delegatee.role !== currentUser.role) {
      throw new BadRequestException(
        `Substitute approver must have the same role (${currentUser.role}). You cannot delegate to a user with role "${delegatee.role}".`,
      );
    }

    const delegation = this.delegationRepository.create({
      delegator: { id: currentUser.id } as User,
      delegatee,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      isActive: true,
    });

    const saved = await this.delegationRepository.save(delegation);

    // Record Task History for active tasks where delegator is approver
    try {
      const activeApprovals = await this.taskApprovalRepository.find({
        where: { assignedApprover: { id: currentUser.id }, action: ApprovalAction.PENDING },
        relations: ['task'],
      });
      for (const app of activeApprovals) {
        if (app.task) {
          await this.historyRepository.save(
            this.historyRepository.create({
              task: { id: app.task.id } as Task,
              action: TaskHistoryAction.DELEGATED,
              actor: { id: currentUser.id } as User,
              targetUser: delegatee,
              stepOrder: app.stepOrder,
              stepName: app.stepName,
              notes: dto.reason
                ? `Delegated from ${currentUser.username} to ${delegatee.username} (${dto.startDate} to ${dto.endDate}): ${dto.reason}`
                : `Delegated from ${currentUser.username} to ${delegatee.username} (${dto.startDate} to ${dto.endDate})`,
            }),
          );
        }
      }
    } catch (e) {
      this.logger.warn('Failed to record history for delegation', e);
    }

    AuditLogger.logAsync({
      who: {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
      },
      what: {
        action: 'CREATE_DELEGATION',
        resource: 'APPROVAL_DELEGATION',
        resourceId: saved.id,
        newState: saved,
      },
      where: { ip },
    });

    return saved;
  }

  async getDelegationCandidates(currentUser: any): Promise<User[]> {
    const qb = this.userRepository.createQueryBuilder('user')
      .where('user.id != :currentUserId', { currentUserId: currentUser.id })
      .andWhere('user.isActive = :isActive', { isActive: true });

    // Non-admin can only delegate to users with the same role
    if (currentUser.role !== RoleEnum.ADMIN) {
      qb.andWhere('user.role = :role', { role: currentUser.role });
    }

    qb.orderBy('user.username', 'ASC');
    return qb.getMany();
  }

  async getDelegations(currentUser: any): Promise<ApprovalDelegation[]> {
    return this.delegationRepository.find({
      where: [{ delegator: { id: currentUser.id } }, { delegatee: { id: currentUser.id } }],
      relations: ['delegator', 'delegatee'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateDelegation(
    id: string,
    dto: UpdateDelegationDto,
    currentUser: any,
    ip: string,
  ): Promise<ApprovalDelegation> {
    const delegation = await this.delegationRepository.findOne({
      where: { id },
      relations: ['delegator', 'delegatee'],
    });
    if (!delegation) throw new NotFoundException('Delegation not found');

    if (currentUser.role !== RoleEnum.ADMIN && delegation.delegator?.id !== currentUser.id) {
      throw new ForbiddenException('Cannot edit delegation belonging to another user');
    }

    const previousState = { ...delegation };

    if (dto.delegateeId) {
      const newDelegatee = await this.userRepository.findOne({
        where: { id: dto.delegateeId, isActive: true },
      });
      if (!newDelegatee) throw new NotFoundException('New delegatee user not found');

      if (newDelegatee.id === currentUser.id) {
        throw new BadRequestException('Cannot delegate approval to yourself');
      }

      if (currentUser.role !== RoleEnum.ADMIN && newDelegatee.role !== currentUser.role) {
        throw new BadRequestException(
          `Substitute approver must have the same role (${currentUser.role}). You cannot delegate to a user with role "${newDelegatee.role}".`,
        );
      }
      delegation.delegatee = newDelegatee;
    }

    if (dto.startDate) delegation.startDate = dto.startDate;
    if (dto.endDate) delegation.endDate = dto.endDate;
    if (dto.reason !== undefined) delegation.reason = dto.reason;
    if (dto.isActive !== undefined) delegation.isActive = dto.isActive;

    const saved = await this.delegationRepository.save(delegation);

    AuditLogger.logAsync({
      who: {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
      },
      what: {
        action: 'UPDATE_DELEGATION',
        resource: 'APPROVAL_DELEGATION',
        resourceId: id,
        previousState,
        newState: saved,
      },
      where: { ip },
    });

    return saved;
  }

  async deactivateDelegation(id: string, currentUser: any, ip: string): Promise<void> {
    const delegation = await this.delegationRepository.findOne({
      where: { id },
      relations: ['delegator'],
    });
    if (!delegation) throw new NotFoundException('Delegation not found');

    if (currentUser.role !== RoleEnum.ADMIN && delegation.delegator?.id !== currentUser.id) {
      throw new ForbiddenException('Cannot cancel delegation of another user');
    }

    delegation.isActive = false;
    await this.delegationRepository.save(delegation);

    AuditLogger.logAsync({
      who: {
        userId: currentUser.id,
        username: currentUser.username,
      },
      what: {
        action: 'DEACTIVATE_DELEGATION',
        resource: 'APPROVAL_DELEGATION',
        resourceId: id,
      },
      where: { ip },
    });
  }
}

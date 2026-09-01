import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import {
  Task,
  TaskApproval,
  ApprovalWorkflow,
  User,
  ApprovalDelegation,
  TaskHistory,
  TaskStatus,
  TaskPriority,
  RoleEnum,
  DivisionEnum,
  ApprovalAction,
} from '../../entities';
import { ApprovalDecisionEnum } from './dto/approval-action.dto';

describe('TasksService', () => {
  let service: TasksService;

  const mockCreator: Partial<User> = {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'staff_it',
    password: 'hashedpassword',
    role: RoleEnum.STAFF,
    division: DivisionEnum.IT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockManager: Partial<User> = {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'manager_it',
    password: 'hashedpassword',
    role: RoleEnum.MANAGER,
    division: DivisionEnum.IT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubstituteManager: Partial<User> = {
    id: '55555555-5555-5555-5555-555555555555',
    username: 'manager_biz',
    password: 'hashedpassword',
    role: RoleEnum.MANAGER,
    division: DivisionEnum.BUSINESS,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWorkflow: Partial<ApprovalWorkflow> = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Multi-Level Same User Workflow',
    description: 'Workflow testing level isolation for same user',
    version: 1,
    isActive: true,
    steps: [
      { stepOrder: 1, name: 'Level 1: Manager Review', roleRequired: RoleEnum.MANAGER, logic: 'ANY' },
      { stepOrder: 2, name: 'Level 2: Manager Final Sign-off', roleRequired: RoleEnum.MANAGER, logic: 'ANY' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTask: Partial<Task> = {
    id: '44444444-4444-4444-4444-444444444444',
    title: 'Pengadaan Server Baru',
    description: 'Pengadaan server database',
    priority: TaskPriority.HIGH,
    status: TaskStatus.PENDING,
    division: DivisionEnum.IT,
    workflowVersion: 1,
    snapshotWorkflowSteps: mockWorkflow.steps,
    currentStepOrder: 1,
    notes: 'Initial request',
    attachments: [],
    creator: mockCreator as User,
    workflow: mockWorkflow as ApprovalWorkflow,
    approvals: [],
    histories: [],
    createdAt: new Date('2026-08-29T10:00:00Z'),
    updatedAt: new Date('2026-08-29T10:00:00Z'),
  };

  const mockTaskRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepo = {
    find: jest.fn().mockResolvedValue([mockManager]),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockManager]),
    }),
  };

  const mockWorkflowRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockTaskApprovalRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    }),
  };

  const mockDelegationRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockHistoryRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: mockTaskRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(ApprovalWorkflow), useValue: mockWorkflowRepo },
        { provide: getRepositoryToken(TaskApproval), useValue: mockTaskApprovalRepo },
        { provide: getRepositoryToken(ApprovalDelegation), useValue: mockDelegationRepo },
        { provide: getRepositoryToken(TaskHistory), useValue: mockHistoryRepo },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Multi-Level Isolation for Same User', () => {
    it('should only approve level 1 and require user to approve level 2 separately', async () => {
      const approvalLevel1: Partial<TaskApproval> = {
        id: 'appr-l1',
        stepOrder: 1,
        stepName: 'Level 1: Manager Review',
        action: ApprovalAction.PENDING,
        assignedApprover: mockManager as User,
      };

      const approvalLevel2: Partial<TaskApproval> = {
        id: 'appr-l2',
        stepOrder: 2,
        stepName: 'Level 2: Manager Final Sign-off',
        action: ApprovalAction.PENDING,
        assignedApprover: mockManager as User,
      };

      const taskAtLevel1 = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        currentStepOrder: 1,
        approvals: [approvalLevel1 as TaskApproval, approvalLevel2 as TaskApproval],
      };

      mockTaskRepo.findOne.mockResolvedValue(taskAtLevel1);
      mockTaskRepo.save.mockResolvedValue({ ...taskAtLevel1, currentStepOrder: 2 });
      mockTaskApprovalRepo.find.mockResolvedValue([
        { ...approvalLevel1, action: ApprovalAction.APPROVED },
      ]);
      mockTaskApprovalRepo.save.mockResolvedValue(approvalLevel1);
      mockHistoryRepo.create.mockReturnValue({});
      mockHistoryRepo.save.mockResolvedValue({});

      // Step 1: manager approves Level 1
      const result = await service.processApproval(
        taskAtLevel1.id!,
        { decision: ApprovalDecisionEnum.APPROVED, notes: 'Level 1 approved' },
        mockManager,
        '127.0.0.1',
      );

      // Verify Level 1 was approved, and Level 2 remains strictly isolated (not auto-approved)
      expect(approvalLevel1.action).toBe(ApprovalAction.APPROVED);
      expect(approvalLevel2.action).toBe(ApprovalAction.PENDING);
      expect(mockTaskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStepOrder: 2,
          status: TaskStatus.IN_PROGRESS,
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a task with snapshot workflow and attachments', async () => {
      mockWorkflowRepo.findOne.mockResolvedValue(mockWorkflow);
      mockTaskRepo.create.mockReturnValue(mockTask);
      mockTaskRepo.save.mockResolvedValue(mockTask);
      mockTaskRepo.findOne.mockResolvedValue(mockTask);
      mockHistoryRepo.create.mockReturnValue({});
      mockHistoryRepo.save.mockResolvedValue({});

      const result = await service.create(
        {
          title: 'Pengadaan Laptop Developer',
          description: 'Laptop 5 unit',
          priority: TaskPriority.HIGH,
          division: DivisionEnum.IT,
          attachments: [],
        },
        mockCreator,
        '127.0.0.1',
      );

      expect(result).toBeDefined();
      expect(mockTaskRepo.save).toHaveBeenCalled();
      expect(mockHistoryRepo.save).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a task if found and user has access', async () => {
      mockTaskRepo.findOne.mockResolvedValue(mockTask);
      const result = await service.findById(mockTask.id!, mockCreator);
      expect(result.id).toEqual(mockTask.id);
    });

    it('should throw NotFoundException if task does not exist', async () => {
      mockTaskRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('non-existent', mockCreator)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a pending task by creator', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      mockTaskRepo.findOne
        .mockResolvedValueOnce(pendingTask)
        .mockResolvedValueOnce({ ...pendingTask, title: 'Updated Title' });
      mockTaskRepo.save.mockResolvedValue({ ...pendingTask, title: 'Updated Title' });

      const result = await service.update(
        mockTask.id!,
        { title: 'Updated Title' },
        mockCreator,
        '127.0.0.1',
      );

      expect(result.title).toBe('Updated Title');
    });

    it('should throw BadRequestException if updating final/approved task', async () => {
      const approvedTask = { ...mockTask, status: TaskStatus.APPROVED };
      mockTaskRepo.findOne.mockResolvedValue(approvedTask);

      await expect(
        service.update(mockTask.id!, { title: 'Updated' }, mockCreator, '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createDelegation', () => {
    it('should enforce same-role delegation constraint', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockCreator);

      await expect(
        service.createDelegation(
          {
            delegateeId: mockCreator.id!,
            reason: 'Passing to staff',
            startDate: '2026-08-28',
            endDate: '2026-08-30',
          },
          mockManager,
          '127.0.0.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDelegation', () => {
    it('should allow delegator to update delegation period and delegatee', async () => {
      const existingDelegation = {
        id: 'del-1',
        delegator: mockManager,
        delegatee: mockSubstituteManager,
        startDate: '2026-08-28',
        endDate: '2026-08-30',
        reason: 'Initial leave',
        isActive: true,
      };

      mockDelegationRepo.findOne.mockResolvedValue(existingDelegation);
      mockUserRepo.findOne.mockResolvedValue(mockSubstituteManager);
      mockDelegationRepo.save.mockResolvedValue({
        ...existingDelegation,
        startDate: '2026-09-01',
        endDate: '2026-09-05',
      });

      const result = await service.updateDelegation(
        'del-1',
        {
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          reason: 'Extended leave',
        },
        mockManager,
        '127.0.0.1',
      );

      expect(result.startDate).toBe('2026-09-01');
      expect(mockDelegationRepo.save).toHaveBeenCalled();
    });
  });
});

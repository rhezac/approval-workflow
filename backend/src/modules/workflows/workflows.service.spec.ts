import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowsService } from './workflows.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ApprovalWorkflow, RoleEnum, Task } from '../../entities';

describe('WorkflowsService', () => {
  let service: WorkflowsService;

  const mockWorkflow: Partial<ApprovalWorkflow> = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Standard IT Workflow',
    description: 'IT workflow description',
    version: 1,
    isActive: true,
    steps: [
      { stepOrder: 1, name: 'Manager Review', roleRequired: RoleEnum.MANAGER, logic: 'ANY' },
      { stepOrder: 2, name: 'Director Approval', roleRequired: RoleEnum.DIREKTUR, logic: 'ALL' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWorkflowRepo = {
    find: jest.fn().mockResolvedValue([mockWorkflow]),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockWorkflow]),
    }),
  };

  const mockTaskRepo = {
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        {
          provide: getRepositoryToken(ApprovalWorkflow),
          useValue: mockWorkflowRepo,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepo,
        },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all workflows', async () => {
      const workflows = await service.findAll(true);
      expect(workflows).toHaveLength(1);
      expect(workflows[0].name).toBe('Standard IT Workflow');
    });
  });

  describe('findById', () => {
    it('should return workflow if exists', async () => {
      mockWorkflowRepo.findOne.mockResolvedValue(mockWorkflow);
      const workflow = await service.findById(mockWorkflow.id!);
      expect(workflow).toEqual(mockWorkflow);
    });

    it('should throw NotFoundException if workflow not found', async () => {
      mockWorkflowRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new workflow', async () => {
      mockWorkflowRepo.create.mockReturnValue(mockWorkflow);
      mockWorkflowRepo.save.mockResolvedValue(mockWorkflow);

      const result = await service.create(
        {
          name: 'Standard IT Workflow',
          description: 'IT workflow description',
          steps: mockWorkflow.steps as any,
        },
        { id: 'admin-id', username: 'admin', role: RoleEnum.ADMIN },
        '127.0.0.1',
      );

      expect(result.name).toBe('Standard IT Workflow');
      expect(mockWorkflowRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should allow deletion when no active/incomplete tasks exist', async () => {
      mockWorkflowRepo.findOne.mockResolvedValue(mockWorkflow);
      mockTaskRepo.createQueryBuilder().getCount.mockResolvedValue(0);
      mockWorkflowRepo.remove.mockResolvedValue(mockWorkflow);

      await service.remove(mockWorkflow.id!, { id: 'admin-id', username: 'admin' }, '127.0.0.1');
      expect(mockWorkflowRepo.remove).toHaveBeenCalled();
    });

    it('should block deletion with BadRequestException if active incomplete tasks exist', async () => {
      mockWorkflowRepo.findOne.mockResolvedValue(mockWorkflow);
      mockTaskRepo.createQueryBuilder().getCount.mockResolvedValue(2); // 2 active tasks

      await expect(
        service.remove(mockWorkflow.id!, { id: 'admin-id', username: 'admin' }, '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

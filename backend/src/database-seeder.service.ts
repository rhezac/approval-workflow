import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, DivisionEnum, RoleEnum } from './entities/user.entity';
import { ApprovalWorkflow } from './entities/approval-workflow.entity';

@Injectable()
export class DatabaseSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ApprovalWorkflow)
    private workflowRepository: Repository<ApprovalWorkflow>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedUsers();
    await this.seedWorkflows();
  }

  private async seedUsers() {
    const userCount = await this.userRepository.count();
    if (userCount > 0) return;

    this.logger.log('Seeding initial users and roles...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin@123', salt);

    const initialUsers = [
      { username: 'admin', role: RoleEnum.ADMIN, division: DivisionEnum.IT },
      { username: 'direktur', role: RoleEnum.DIREKTUR, division: DivisionEnum.BUSINESS },
      { username: 'manager_it', role: RoleEnum.MANAGER, division: DivisionEnum.IT },
      { username: 'manager_fin', role: RoleEnum.MANAGER, division: DivisionEnum.FINANCE },
      { username: 'manager_biz', role: RoleEnum.MANAGER, division: DivisionEnum.BUSINESS },
      { username: 'staff_it', role: RoleEnum.STAFF, division: DivisionEnum.IT },
      { username: 'staff_fin', role: RoleEnum.STAFF, division: DivisionEnum.FINANCE },
      { username: 'staff_biz', role: RoleEnum.STAFF, division: DivisionEnum.BUSINESS },
    ];

    for (const u of initialUsers) {
      const newUser = this.userRepository.create({
        username: u.username,
        password: passwordHash,
        role: u.role,
        division: u.division,
        isActive: true,
      });
      await this.userRepository.save(newUser);
    }
    this.logger.log('Initial users created (Default password for all: Admin@123)');
  }

  private async seedWorkflows() {
    const wfCount = await this.workflowRepository.count();
    if (wfCount > 0) return;

    this.logger.log('Seeding initial approval workflows...');
    const multiLevelWf = this.workflowRepository.create({
      name: 'Standard Corporate Multi-Level (Staff -> Manager -> Direktur)',
      description: 'Standard multi-step approval workflow with department isolation and director sign-off',
      version: 1,
      isActive: true,
      steps: [
        {
          stepOrder: 1,
          name: 'Manager Approval (Division)',
          roleRequired: RoleEnum.MANAGER,
          divisionRequired: 'SAME_AS_REQUESTER',
          logic: 'ANY',
        },
        {
          stepOrder: 2,
          name: 'Board / Direktur Approval',
          roleRequired: RoleEnum.DIREKTUR,
          divisionRequired: 'ANY',
          logic: 'ANY',
        },
      ],
    });

    await this.workflowRepository.save(multiLevelWf);
    this.logger.log('Default multi-level approval workflow seeded');
  }
}

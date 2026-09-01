import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export type ApproverItemType = 'ROLE_DIVISION' | 'SPECIFIC_USER' | 'MULTI_USER_OPTION';

export interface WorkflowApproverItem {
  id?: string;
  type: ApproverItemType; // 'ROLE_DIVISION' | 'SPECIFIC_USER' | 'MULTI_USER_OPTION'
  label?: string; // e.g. "Manager IT", "Specific: staff_fin", "Option: staff_biz or manager_biz"
  roleRequired?: string; // for ROLE_DIVISION
  divisionRequired?: string; // for ROLE_DIVISION: 'IT', 'Finance', 'Business', 'SAME_AS_REQUESTER', 'ANY'
  userId?: string; // for SPECIFIC_USER (1 user)
  userIds?: string[]; // for MULTI_USER_OPTION (2+ users, any 1 approve)
}

export interface WorkflowStepConfig {
  stepOrder: number;
  name: string;
  // Multi-approver units within this level (All units must be satisfied)
  approverUnits?: WorkflowApproverItem[];
  // Legacy / Direct single-unit support
  roleRequired?: string;
  divisionRequired?: string;
  logic?: 'ANY' | 'ALL';
  approverUserIds?: string[];
  selectionType?: ApproverItemType;
}

@Entity('approval_workflows')
export class ApprovalWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb' })
  steps: WorkflowStepConfig[];

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

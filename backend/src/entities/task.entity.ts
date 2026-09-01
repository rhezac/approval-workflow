import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User, DivisionEnum } from './user.entity';
import { ApprovalWorkflow, WorkflowStepConfig } from './approval-workflow.entity';
import { TaskApproval } from './task-approval.entity';
import { TaskHistory } from './task-history.entity';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELED = 'canceled',
  REVISION = 'revision',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string; // can be upload file URL or external URL
  type: 'file' | 'link';
  notes?: string;
  size?: number;
  uploadedAt: string;
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: DivisionEnum,
  })
  division: DivisionEnum;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @ManyToOne(() => ApprovalWorkflow, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workflow_id' })
  workflow: ApprovalWorkflow;

  @Column({ type: 'int', default: 1 })
  workflowVersion: number;

  @Column({ type: 'jsonb', nullable: true })
  snapshotWorkflowSteps: WorkflowStepConfig[];

  @Column({ type: 'int', default: 1 })
  currentStepOrder: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  attachments: TaskAttachment[];

  @OneToMany(() => TaskApproval, (ta) => ta.task, { cascade: true })
  approvals: TaskApproval[];

  @OneToMany(() => TaskHistory, (th) => th.task, { cascade: true })
  histories: TaskHistory[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

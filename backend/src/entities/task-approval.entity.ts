import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';

export enum ApprovalAction {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVISION = 'REVISION',
  DELEGATED = 'DELEGATED',
  REASSIGNED = 'REASSIGNED',
}

@Entity('task_approvals')
export class TaskApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Task, (task) => task.approvals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'int' })
  stepOrder: number;

  @Column({ length: 100 })
  stepName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  unitId: string; // Grouping ID for multi-user option (ANY logic within unit)

  @Column({ type: 'varchar', length: 150, nullable: true })
  unitLabel: string; // e.g. "Option: staff_biz / manager_biz" or "Manager IT"

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'assigned_approver_id' })
  assignedApprover: User;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'actual_approver_id' })
  actualApprover: User;

  @Column({
    type: 'enum',
    enum: ApprovalAction,
    default: ApprovalAction.PENDING,
  })
  action: ApprovalAction;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamptz', nullable: true })
  actionAt: Date;

  @Column({ default: false })
  isDelegated: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'delegated_by_id' })
  delegatedBy: User;

  @Column({ default: false })
  isReassigned: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reassigned_by_id' })
  reassignedBy: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

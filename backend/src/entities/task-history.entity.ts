import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';

export enum TaskHistoryAction {
  CREATED = 'CREATED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  REVISION_SUBMITTED = 'REVISION_SUBMITTED',
  DELEGATED = 'DELEGATED',
  REASSIGNED = 'REASSIGNED',
  CANCELED = 'CANCELED',
  UPDATED = 'UPDATED',
}

@Entity('task_histories')
export class TaskHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Task, (task) => task.histories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({
    type: 'enum',
    enum: TaskHistoryAction,
  })
  action: TaskHistoryAction;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_user_id' })
  targetUser: User;

  @Column({ type: 'int', nullable: true })
  stepOrder: number;

  @Column({ length: 150, nullable: true })
  stepName: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

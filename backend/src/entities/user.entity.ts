import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum DivisionEnum {
  IT = 'IT',
  FINANCE = 'Finance',
  BUSINESS = 'Business',
  OPERATION = 'Operation',
  HR = 'HR',
}

export enum RoleEnum {
  ADMIN = 'Admin',
  DIREKTUR = 'Direktur',
  HEAD_OF_DIVISION = 'Head of Division',
  MANAGER = 'Manager',
  LEADER = 'Leader',
  STAFF = 'Staff',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  username: string;

  @Column({ length: 150, nullable: true })
  fullName: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: DivisionEnum,
    default: DivisionEnum.IT,
  })
  division: DivisionEnum;

  @Column({
    type: 'enum',
    enum: RoleEnum,
    default: RoleEnum.STAFF,
  })
  role: RoleEnum;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

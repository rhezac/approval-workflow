import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApprovalDecisionEnum {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVISION = 'REVISION',
}

export class ProcessApprovalDto {
  @ApiProperty({ enum: ApprovalDecisionEnum, example: ApprovalDecisionEnum.APPROVED })
  @IsEnum(ApprovalDecisionEnum)
  decision: ApprovalDecisionEnum;

  @ApiPropertyOptional({ example: 'Disetujui sesuai dengan budget Q3' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelTaskDto {
  @ApiProperty({ example: 'Dibatalkan karena perubahan rencana strategi' })
  @IsString()
  @IsNotEmpty()
  notes: string;
}

export class ReassignApprovalDto {
  @ApiProperty({ description: 'UUID of new Approver user' })
  @IsString()
  @IsNotEmpty()
  newApproverId: string;

  @ApiPropertyOptional({ example: 'Reassigned by Admin due to workload' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDelegationDto {
  @ApiProperty({ description: 'ID of Delegatee user' })
  @IsString()
  @IsNotEmpty()
  delegateeId: string;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-09-10' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 'Cuti Tahunan' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateDelegationDto {
  @ApiPropertyOptional({ description: 'ID of new Delegatee user' })
  @IsOptional()
  @IsString()
  delegateeId?: string;

  @ApiPropertyOptional({ example: '2025-09-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-09-10' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Perubahan jadwal cuti' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}

import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DivisionEnum, TaskPriority } from '../../../entities';

export class TaskAttachmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ enum: ['file', 'link'] })
  @IsOptional()
  @IsString()
  type?: 'file' | 'link';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uploadedAt?: string;
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Pengadaan Laptop Developer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Permintaan pembelian 5 unit Macbook Pro untuk tim engineering IT' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.HIGH })
  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @ApiPropertyOptional({ enum: DivisionEnum, example: DivisionEnum.IT })
  @IsOptional()
  @IsEnum(DivisionEnum)
  division?: DivisionEnum;

  @ApiPropertyOptional({ description: 'Optional ID of specific Approval Workflow to use' })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional({ example: 'Initial submission notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [TaskAttachmentDto], description: 'Attachments and Links list' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAttachmentDto)
  attachments?: TaskAttachmentDto[];
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Pengadaan Laptop Developer (Updated)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Detail permintaan diperbarui...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority, example: TaskPriority.URGENT })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: DivisionEnum, example: DivisionEnum.IT })
  @IsOptional()
  @IsEnum(DivisionEnum)
  division?: DivisionEnum;

  @ApiPropertyOptional({ example: 'Update reason' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [TaskAttachmentDto], description: 'Attachments and Links list' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAttachmentDto)
  attachments?: TaskAttachmentDto[];
}

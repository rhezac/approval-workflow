import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, DivisionEnum } from '../../../entities';
import { TaskAttachmentDto } from './task.dto';

export class SubmitRevisionDto {
  @ApiPropertyOptional({ example: 'Pengadaan Laptop Developer (Revised)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Detail revisi perbaikan spesifikasi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ example: 'Sudah disesuaikan dengan rekomendasi approver' })
  @IsString()
  @IsNotEmpty()
  revisionNotes: string;

  @ApiPropertyOptional({ type: [TaskAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAttachmentDto)
  attachments?: TaskAttachmentDto[];
}

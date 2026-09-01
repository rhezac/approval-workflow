import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproverItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ enum: ['ROLE_DIVISION', 'SPECIFIC_USER', 'MULTI_USER_OPTION'] })
  @IsEnum(['ROLE_DIVISION', 'SPECIFIC_USER', 'MULTI_USER_OPTION'])
  type: 'ROLE_DIVISION' | 'SPECIFIC_USER' | 'MULTI_USER_OPTION';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'Manager' })
  @IsOptional()
  @IsString()
  roleRequired?: string;

  @ApiPropertyOptional({ example: 'IT' })
  @IsOptional()
  @IsString()
  divisionRequired?: string;

  @ApiPropertyOptional({ description: 'Specific User ID for SPECIFIC_USER' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ type: [String], description: 'List of User IDs for MULTI_USER_OPTION' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];
}

export class StepConfigDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  stepOrder: number;

  @ApiProperty({ example: 'Level 1: Multi-Unit Review' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ type: [ApproverItemDto], description: 'Multi approval units within this level' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApproverItemDto)
  approverUnits?: ApproverItemDto[];

  // Legacy fallback fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleRequired?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  divisionRequired?: string;

  @ApiPropertyOptional({ enum: ['ANY', 'ALL'] })
  @IsOptional()
  @IsEnum(['ANY', 'ALL'])
  logic?: 'ANY' | 'ALL';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approverUserIds?: string[];
}

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Multi-Level Multi-Approver Workflow' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Level 1: Manager IT, Manager Fin, staff_fin, & Option(staff_biz / manager_biz)' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [StepConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepConfigDto)
  steps: StepConfigDto[];
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional({ example: 'Multi-Level Multi-Approver Workflow v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [StepConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepConfigDto)
  steps?: StepConfigDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

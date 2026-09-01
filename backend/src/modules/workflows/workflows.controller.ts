import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';
import { Roles } from '../../common/decorators/auth.decorator';

@ApiTags('Approval Workflows Configuration')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'x-api-key', required: false, description: 'API Key alternative auth' })
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of approval workflows' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - List of approval workflows retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'w1000000-0000-0000-0000-000000000001' },
          name: { type: 'string', example: 'Multi-Level Approval Flow' },
          description: { type: 'string', example: 'Standard sequential multi-level approval pipeline' },
          version: { type: 'number', example: 1 },
          isActive: { type: 'boolean', example: true },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                stepOrder: { type: 'number', example: 1 },
                name: { type: 'string', example: 'Level 1: Leads' },
                approverUnits: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'u-1-1' },
                      type: { type: 'string', example: 'ROLE_DIVISION' },
                      label: { type: 'string', example: 'Manager IT' },
                    },
                  },
                },
              },
            },
          },
          createdAt: { type: 'string', example: '2026-08-28T05:05:57.403Z' },
        },
      },
    },
  })
  async findAll(@Query('activeOnly') activeOnly?: boolean) {
    return this.workflowsService.findAll(activeOnly);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Workflow blueprint retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Not Found - Workflow with specified ID not found' })
  async findOne(@Param('id') id: string) {
    return this.workflowsService.findById(id);
  }

  @Post()
  @Roles('Admin')
  @ApiOperation({ summary: 'Admin: Create new approval workflow' })
  @ApiResponse({
    status: 201,
    description: 'Created - New approval workflow template created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Missing required levels or invalid step schema' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires Admin role' })
  async create(@Body() createDto: CreateWorkflowDto, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.workflowsService.create(createDto, req.user, ip);
  }

  @Put(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Admin: Update approval workflow (auto-versioning if steps changed)' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Workflow updated successfully with version increment if steps modified',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed on workflow steps' })
  @ApiResponse({ status: 404, description: 'Not Found - Workflow with specified ID not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkflowDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.workflowsService.update(id, updateDto, req.user, ip);
  }

  @Delete(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Admin: Delete approval workflow' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Approval workflow deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Workflow with ID w1000000-0000-0000-0000-000000000001 deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Cannot delete workflow associated with active/open tasks' })
  @ApiResponse({ status: 404, description: 'Not Found - Workflow with specified ID not found' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await this.workflowsService.remove(id, req.user, ip);
    return { success: true, message: `Workflow with ID ${id} deleted successfully` };
  }
}

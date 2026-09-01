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
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import {
  ProcessApprovalDto,
  CancelTaskDto,
  ReassignApprovalDto,
  CreateDelegationDto,
  UpdateDelegationDto,
} from './dto/approval-action.dto';
import { Roles } from '../../common/decorators/auth.decorator';

@ApiTags('Task Management & Approvals')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'x-api-key', required: false, description: 'API Key alternative auth' })
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get tasks visible to current user (Role-filtered)' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - List of tasks visible to the current authenticated user',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '2cd513e3-5065-4c83-bef0-91a342c46a3d' },
          title: { type: 'string', example: 'Q3 Hardware Procurement' },
          description: { type: 'string', example: 'Server hardware upgrade request' },
          priority: { type: 'string', example: 'HIGH' },
          status: { type: 'string', example: 'in progress' },
          division: { type: 'string', example: 'IT' },
          currentStepOrder: { type: 'number', example: 1 },
          canApprove: { type: 'boolean', example: true },
          isOwnTask: { type: 'boolean', example: false },
          createdAt: { type: 'string', example: '2026-08-30T07:00:23.626Z' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid authentication credentials' })
  async findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('division') division?: string,
    @Query('search') search?: string,
  ) {
    return this.tasksService.findAll(req.user, { status, division, search });
  }

  @Get('delegates/candidates')
  @ApiOperation({ summary: 'Get candidate users for delegation (Same role)' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - List of candidate substitute users holding the exact same role',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  async getDelegationCandidates(@Req() req: any) {
    return this.tasksService.getDelegationCandidates(req.user);
  }

  @Get('delegations')
  @ApiOperation({ summary: 'Get current user delegations' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - List of approval delegations for current user',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  async getDelegations(@Req() req: any) {
    return this.tasksService.getDelegations(req.user);
  }

  @Post('delegations')
  @ApiOperation({ summary: 'Create approval delegation when on leave' })
  @ApiResponse({
    status: 201,
    description: 'Created - Approval authority delegation registered successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Mismatched role, self-delegation, or invalid date range' })
  @ApiResponse({ status: 404, description: 'Not Found - Delegatee user not found' })
  async createDelegation(@Body() dto: CreateDelegationDto, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.tasksService.createDelegation(dto, req.user, ip);
  }

  @Put('delegations/:id')
  @ApiOperation({ summary: 'Update an existing delegation (delegatee, date range, reason)' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Delegation updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error on update fields' })
  @ApiResponse({ status: 404, description: 'Not Found - Delegation record not found' })
  async updateDelegation(
    @Param('id') id: string,
    @Body() dto: UpdateDelegationDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.tasksService.updateDelegation(id, dto, req.user, ip);
  }

  @Delete('delegations/:id')
  @ApiOperation({ summary: 'Deactivate an active delegation' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Delegation deactivated successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot deactivate another user delegation' })
  @ApiResponse({ status: 404, description: 'Not Found - Delegation record not found' })
  async cancelDelegation(@Param('id') id: string, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await this.tasksService.deactivateDelegation(id, req.user, ip);
    return { success: true, message: 'Delegation deactivated' };
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.resolve(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
    }),
  )
  @ApiOperation({ summary: 'Upload file attachment for tasks' })
  @ApiResponse({
    status: 201,
    description: 'Created - File attachment stored on server successfully',
    schema: {
      type: 'object',
      properties: {
        fileName: { type: 'string', example: 'vendor-quote.pdf' },
        storedName: { type: 'string', example: '1724819000-12345.pdf' },
        size: { type: 'number', example: 1048576 },
        downloadUrl: { type: 'string', example: '/api/tasks/download/1724819000-12345.pdf' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - No file uploaded or file exceeds 25MB' })
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      fileName: file.originalname,
      storedName: file.filename,
      size: file.size,
      downloadUrl: `/api/tasks/download/${file.filename}`,
    };
  }

  @Get('download/:filename')
  @ApiOperation({ summary: 'Download task attachment file' })
  @ApiResponse({ status: 200, description: 'Success Operation - File binary stream downloaded' })
  @ApiResponse({ status: 404, description: 'Not Found - Attachment file not found on disk' })
  downloadFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.resolve(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Attachment file not found' });
    }
    return res.download(filePath);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task detail and approval progression' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Full task detail, attachments, progression, and historical audit logs',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - You are not authorized to view this task' })
  @ApiResponse({ status: 404, description: 'Not Found - Task with specified ID does not exist' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.findById(id, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Created - Task registered and workflow approval pipeline initialized',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error or inactive workflow template' })
  async create(@Body() createDto: CreateTaskDto, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.tasksService.create(createDto, req.user, ip);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task (Creator or Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Task details updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Cannot edit task after it has advanced beyond pending' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only task creator or Admin can update task' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTaskDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.tasksService.update(id, updateDto, req.user, ip);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task (Creator or Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Task deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Only task creator or Admin can delete task' })
  @ApiResponse({ status: 404, description: 'Not Found - Task with specified ID not found' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await this.tasksService.remove(id, req.user, ip);
    return { success: true, message: `Task ${id} deleted successfully` };
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve, Reject, or Request Revision for task' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Decision recorded and step progression or terminal state updated',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Task is already in terminal state (approved/rejected/canceled)' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot approve own task or user not authorized at current stage' })
  @ApiResponse({ status: 404, description: 'Not Found - Task with specified ID not found' })
  async processApproval(
    @Param('id') id: string,
    @Body() processDto: ProcessApprovalDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.tasksService.processApproval(id, processDto, req.user, ip);
  }

  @Post(':id/submit-revision')
  @ApiOperation({ summary: 'Staff/Creator: Submit revision to restart approval review' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Revision submitted and task returned to in-progress approval pipeline',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Task is not in revision status' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only task creator or Admin can submit revision' })
  @ApiResponse({ status: 404, description: 'Not Found - Task with specified ID not found' })
  async submitRevision(
    @Param('id') id: string,
    @Body() revisionDto: any,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.tasksService.submitRevision(id, revisionDto, req.user, ip);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel task with reason' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Task marked as Canceled with reason recorded in audit trail',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Only task creator or Admin can cancel task' })
  @ApiResponse({ status: 404, description: 'Not Found - Task with specified ID not found' })
  async cancelTask(
    @Param('id') id: string,
    @Body() cancelDto: CancelTaskDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.tasksService.cancelTask(id, cancelDto, req.user, ip);
  }

  @Post('approvals/:approvalId/reassign')
  @Roles('Admin')
  @ApiOperation({ summary: 'Admin: Reassign pending task approval to another user' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Pending approval reassigned to new user with history recorded',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires Admin role' })
  @ApiResponse({ status: 404, description: 'Not Found - Approval record or new approver user not found' })
  async reassignApproval(
    @Param('approvalId') approvalId: string,
    @Body() reassignDto: ReassignApprovalDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.tasksService.reassignApproval(approvalId, reassignDto, req.user, ip);
  }
}

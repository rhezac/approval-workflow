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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { Roles } from '../../common/decorators/auth.decorator';
import { Request } from 'express';

@ApiTags('User Management')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'x-api-key', required: false, description: 'API Key alternative auth' })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('Admin', 'Manager', 'Direktur', 'Staff', 'Head of Division', 'Leader')
  @ApiOperation({ summary: 'Get list of users with filter and autocomplete search' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - List of users retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'a0000000-0000-0000-0000-000000000003' },
          username: { type: 'string', example: 'manager_it' },
          fullName: { type: 'string', example: 'Irwan Manager IT' },
          role: { type: 'string', example: 'Manager' },
          division: { type: 'string', example: 'IT' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', example: '2026-08-28T05:05:57.403Z' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing, invalid, or expired authentication token',
  })
  async findAll(
    @Query('division') division?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll({ division, role, search, limit });
  }

  @Get(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Admin: Get user details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - User record retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'a0000000-0000-0000-0000-000000000003' },
        username: { type: 'string', example: 'manager_it' },
        fullName: { type: 'string', example: 'Irwan Manager IT' },
        role: { type: 'string', example: 'Manager' },
        division: { type: 'string', example: 'IT' },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have Admin privilege' })
  @ApiResponse({ status: 404, description: 'Not Found - User with specified ID does not exist' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles('Admin')
  @ApiOperation({ summary: 'Admin: Create new user' })
  @ApiResponse({
    status: 201,
    description: 'Created - User account created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'a0000000-0000-0000-0000-000000000099' },
        username: { type: 'string', example: 'head_ops' },
        fullName: { type: 'string', example: 'Hendro Head Operations' },
        role: { type: 'string', example: 'Head of Division' },
        division: { type: 'string', example: 'Operation' },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error on body fields' })
  @ApiResponse({ status: 409, description: 'Conflict - Username is already taken' })
  async create(@Body() createUserDto: CreateUserDto, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.usersService.create(createUserDto, req.user, ip);
  }

  @Put(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Admin: Update user' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - User details updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error on update fields' })
  @ApiResponse({ status: 404, description: 'Not Found - User with specified ID not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.usersService.update(id, updateUserDto, req.user, ip);
  }

  @Delete(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Admin: Delete user' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User with ID a0000000-0000-0000-0000-000000000099 deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Not Found - User with specified ID not found' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await this.usersService.remove(id, req.user, ip);
    return { success: true, message: `User with ID ${id} deleted successfully` };
  }
}

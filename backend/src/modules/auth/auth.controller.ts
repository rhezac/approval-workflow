import { Controller, Post, Body, Req, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/auth.decorator';
import { Request } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'User authentication with credentials to obtain JWT Bearer Token' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Authentication successful, returns JWT token and user profile metadata',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'a0000000-0000-0000-0000-000000000001' },
            username: { type: 'string', example: 'admin' },
            fullName: { type: 'string', example: 'Administrator IT' },
            role: { type: 'string', example: 'Admin' },
            division: { type: 'string', example: 'IT' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation failed (e.g. missing username or password)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['username should not be empty'] },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid username or password, or inactive account',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid username or password' },
      },
    },
  })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.login(loginDto, ip, userAgent);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Current user profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'a0000000-0000-0000-0000-000000000001' },
        username: { type: 'string', example: 'admin' },
        fullName: { type: 'string', example: 'Administrator IT' },
        role: { type: 'string', example: 'Admin' },
        division: { type: 'string', example: 'IT' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or expired JWT Bearer token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async getProfile(@Req() req: any) {
    return this.authService.getCurrentProfile(req.user.id);
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../../entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyGuard } from './guards/api-key.guard';
import { CombinedAuthGuard } from './guards/combined-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super_secret_jwt_key_approval_workflow_2025_secure_random',
      signOptions: { expiresIn: (process.env.JWT_EXPIRATION as any) || '3600s' }, // 1 hour expiration
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ApiKeyGuard, CombinedAuthGuard, RolesGuard],
  exports: [AuthService, ApiKeyGuard, CombinedAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, RoleEnum, DivisionEnum } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { AuditLogger } from '../../common/audit/audit-logger';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<User | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getOne();

    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  async login(loginDto: LoginDto, ip: string, userAgent: string) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      AuditLogger.logAsync({
        who: { username: loginDto.username },
        what: {
          action: 'LOGIN_FAILED',
          resource: 'AUTH',
          details: 'Failed login attempt with invalid credentials',
        },
        where: { ip, userAgent },
      });
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      fullName: user.fullName || user.username,
      role: user.role,
      division: user.division,
    };

    const token = this.jwtService.sign(payload);

    AuditLogger.logAsync({
      who: {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        division: user.division,
      },
      what: {
        action: 'LOGIN_SUCCESS',
        resource: 'AUTH',
        details: `User ${user.username} logged in successfully`,
      },
      where: { ip, userAgent },
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        division: user.division,
      },
    };
  }

  async getCurrentProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User profile not found');
    return user;
  }
}

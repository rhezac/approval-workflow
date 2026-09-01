import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { AuditLogger } from '../../common/audit/audit-logger';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(query?: { division?: string; role?: string; search?: string; limit?: number }) {
    const qb = this.userRepository.createQueryBuilder('user');
    if (query?.division) {
      qb.andWhere('user.division = :division', { division: query.division });
    }
    if (query?.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }
    if (query?.search) {
      qb.andWhere('(user.username ILIKE :search OR user.fullName ILIKE :search)', { search: `%${query.search}%` });
    }
    qb.orderBy('COALESCE(user.fullName, user.username)', 'ASC');
    if (query?.limit && Number(query.limit) > 0) {
      qb.take(Number(query.limit));
    }
    return qb.getMany();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto, currentUser: any, ip: string): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (existing) {
      throw new ConflictException(`Username "${createUserDto.username}" is already taken`);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const saved = await this.userRepository.save(newUser);

    AuditLogger.logAsync({
      who: {
        userId: currentUser?.id,
        username: currentUser?.username,
        role: currentUser?.role,
      },
      what: {
        action: 'CREATE_USER',
        resource: 'USER',
        resourceId: saved.id,
        newState: {
          id: saved.id,
          username: saved.username,
          division: saved.division,
          role: saved.role,
        },
      },
      where: { ip },
    });

    return saved;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any, ip: string): Promise<User> {
    const user = await this.findById(id);
    const previousState = { ...user };

    if (updateUserDto.fullName !== undefined) {
      user.fullName = updateUserDto.fullName;
    }
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(updateUserDto.password, salt);
    }
    if (updateUserDto.division !== undefined) {
      user.division = updateUserDto.division;
    }
    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }
    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    const updated = await this.userRepository.save(user);

    AuditLogger.logAsync({
      who: {
        userId: currentUser?.id,
        username: currentUser?.username,
        role: currentUser?.role,
      },
      what: {
        action: 'UPDATE_USER',
        resource: 'USER',
        resourceId: updated.id,
        previousState,
        newState: {
          id: updated.id,
          username: updated.username,
          division: updated.division,
          role: updated.role,
          isActive: updated.isActive,
        },
      },
      where: { ip },
    });

    return updated;
  }

  async remove(id: string, currentUser: any, ip: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);

    AuditLogger.logAsync({
      who: {
        userId: currentUser?.id,
        username: currentUser?.username,
        role: currentUser?.role,
      },
      what: {
        action: 'DELETE_USER',
        resource: 'USER',
        resourceId: id,
        previousState: {
          id: user.id,
          username: user.username,
          division: user.division,
          role: user.role,
        },
      },
      where: { ip },
    });
  }
}

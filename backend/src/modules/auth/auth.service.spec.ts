import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { User, RoleEnum, DivisionEnum } from '../../entities/user.entity';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let queryBuilder: any;

  const mockUser: Partial<User> = {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'staff_it',
    password: '$2a$10$hashedpassword',
    role: RoleEnum.STAFF,
    division: DivisionEnum.IT,
    isActive: true,
  };

  const mockUserRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mocked-jwt-token'),
  };

  beforeEach(async () => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      queryBuilder.getOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

      const result = await service.validateUser('staff_it', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should return null when password does not match', async () => {
      queryBuilder.getOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      const result = await service.validateUser('staff_it', 'wrongpassword');
      expect(result).toBeNull();
    });

    it('should return null when user is not found', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password123');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return accessToken and user data when login succeeds', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as User);

      const result = await service.login(
        { username: 'staff_it', password: 'password123' },
        '127.0.0.1',
        'Jest-Test-Agent',
      );

      expect(result).toHaveProperty('accessToken', 'mocked-jwt-token');
      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        division: mockUser.division,
      });
    });

    it('should throw UnauthorizedException when login fails', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(
        service.login(
          { username: 'staff_it', password: 'wrongpassword' },
          '127.0.0.1',
          'Jest-Test-Agent',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

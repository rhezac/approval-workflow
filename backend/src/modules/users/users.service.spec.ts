import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { User, RoleEnum, DivisionEnum } from '../../entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: Partial<User> = {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'staff_it',
    password: '$2a$10$hashedpassword',
    role: RoleEnum.STAFF,
    division: DivisionEnum.IT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockUser]),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of users', async () => {
      const users = await service.findAll({ division: 'IT', role: 'Staff' });
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('staff_it');
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const user = await service.findById(mockUser.id!);
      expect(user).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should successfully create a new user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(
        {
          username: 'staff_it',
          password: 'Password@123',
          role: RoleEnum.STAFF,
          division: DivisionEnum.IT,
        },
        { id: 'admin-id', username: 'admin', role: RoleEnum.ADMIN },
        '127.0.0.1',
      );

      expect(result.username).toBe('staff_it');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when username is already taken', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.create(
          {
            username: 'staff_it',
            password: 'Password@123',
            role: RoleEnum.STAFF,
            division: DivisionEnum.IT,
          },
          { id: 'admin-id', username: 'admin', role: RoleEnum.ADMIN },
          '127.0.0.1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});

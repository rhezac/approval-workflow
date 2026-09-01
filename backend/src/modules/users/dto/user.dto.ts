import { IsString, IsNotEmpty, MinLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DivisionEnum, RoleEnum } from '../../../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'johndoe', description: 'Unique username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Full name of user' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ example: 'Pass@1234', description: 'Plain text password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: DivisionEnum, example: DivisionEnum.IT })
  @IsEnum(DivisionEnum)
  division: DivisionEnum;

  @ApiProperty({ enum: RoleEnum, example: RoleEnum.STAFF })
  @IsEnum(RoleEnum)
  role: RoleEnum;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Full name of user' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'Pass@1234', description: 'Updated password' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ enum: DivisionEnum, example: DivisionEnum.IT })
  @IsOptional()
  @IsEnum(DivisionEnum)
  division?: DivisionEnum;

  @ApiPropertyOptional({ enum: RoleEnum, example: RoleEnum.MANAGER })
  @IsOptional()
  @IsEnum(RoleEnum)
  role?: RoleEnum;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: { findUnique: jest.fn() },
    roleAssignment: { findMany: jest.fn() },
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('rejects inactive accounts even with the correct password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 7,
      isActive: false,
      passwordHash: await argon2.hash('test-password'),
    });
    await expect(
      service.login({ email: 'test@example.test', password: 'test-password' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });
  it('continues to allow active accounts with the correct password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'test@example.test',
      isActive: true,
      passwordHash: await argon2.hash('test-password'),
    });
    prismaMock.roleAssignment.findMany.mockResolvedValue([]);
    jwtServiceMock.signAsync.mockResolvedValue('token');
    await expect(
      service.login({ email: 'test@example.test', password: 'test-password' }),
    ).resolves.toMatchObject({
      accessToken: 'token',
      user: { id: 7, isActive: true },
      roles: [],
    });
  });
});

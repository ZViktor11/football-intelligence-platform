
import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

import { Role } from '../../generated/prisma/client';
import { AuthService } from './auth.service';
import { CompetitionAccessGuard } from './competition-access.guard';

describe('CompetitionAccessGuard', () => {
  let guard: CompetitionAccessGuard;

  const authServiceMock = {
    getUserRoles: jest.fn(),
  };

  const createContext = (
    userId: number | undefined,
    competitionId: string,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user:
            userId === undefined
              ? undefined
              : { sub: userId },
          params: {
            id: competitionId,
          },
        }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new CompetitionAccessGuard(
      authServiceMock as unknown as AuthService,
    );
  });

  it('should allow system admins to edit any competition', async () => {
    authServiceMock.getUserRoles.mockResolvedValue([
      {
        role: Role.SYSTEM_ADMIN,
        competitionId: null,
      },
    ]);

    await expect(
      guard.canActivate(createContext(1, '99')),
    ).resolves.toBe(true);
  });

  it('should allow competition admins to edit assigned competitions', async () => {
    authServiceMock.getUserRoles.mockResolvedValue([
      {
        role: Role.COMPETITION_ADMIN,
        competitionId: 5,
      },
    ]);

    await expect(
      guard.canActivate(createContext(2, '5')),
    ).resolves.toBe(true);
  });

  it('should reject competition admins editing other competitions', async () => {
    authServiceMock.getUserRoles.mockResolvedValue([
      {
        role: Role.COMPETITION_ADMIN,
        competitionId: 5,
      },
    ]);

    await expect(
      guard.canActivate(createContext(2, '6')),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject match admins', async () => {
    authServiceMock.getUserRoles.mockResolvedValue([
      {
        role: Role.MATCH_ADMIN,
        competitionId: null,
      },
    ]);

    await expect(
      guard.canActivate(createContext(3, '5')),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject users without role assignments', async () => {
    authServiceMock.getUserRoles.mockResolvedValue([]);

    await expect(
      guard.canActivate(createContext(4, '5')),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject requests without an authenticated user', async () => {
    await expect(
      guard.canActivate(createContext(undefined, '5')),
    ).rejects.toThrow(ForbiddenException);

    expect(
      authServiceMock.getUserRoles,
    ).not.toHaveBeenCalled();
  });

  it('should reject invalid competition IDs', async () => {
    await expect(
      guard.canActivate(createContext(1, 'invalid')),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject zero and negative competition IDs', async () => {
    for (const competitionId of ['0', '-1']) {
      await expect(
        guard.canActivate(createContext(1, competitionId)),
      ).rejects.toThrow(BadRequestException);
    }
  });
});

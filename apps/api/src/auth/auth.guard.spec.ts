import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from './auth.guard';

describe('AuthGuard account status', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const jwt = { verifyAsync: jest.fn() };
  const guard = new AuthGuard(
    jwt as unknown as JwtService,
    prisma as unknown as PrismaService,
  );
  const context = (authorization?: string) => {
    const request = { headers: { authorization }, user: undefined as unknown };
    return {
      request,
      context: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as ExecutionContext,
    };
  };
  beforeEach(() => {
    jest.resetAllMocks();
    jwt.verifyAsync.mockResolvedValue({ sub: 7, email: 'test@example.test' });
    prisma.user.findUnique.mockResolvedValue({ isActive: true });
  });
  it('accepts a valid token belonging to an active user', async () => {
    const ctx = context('Bearer token');
    await expect(guard.canActivate(ctx.context)).resolves.toBe(true);
    expect(ctx.request.user).toEqual({ sub: 7, email: 'test@example.test' });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { isActive: true },
    });
  });
  it.each([{ isActive: false }, null])(
    'rejects inactive or deleted accounts with an existing token: %j',
    async (user) => {
      prisma.user.findUnique.mockResolvedValue(user);
      const ctx = context('Bearer token');
      await expect(guard.canActivate(ctx.context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(ctx.request.user).toBeUndefined();
    },
  );
  it.each([undefined, 'Basic token', 'Bearer'])(
    'rejects missing or malformed authorization: %s',
    async (header) => {
      await expect(guard.canActivate(context(header).context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    },
  );
  it('rejects invalid or expired tokens without a database lookup', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('expired'));
    await expect(
      guard.canActivate(context('Bearer token').context),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it.each([undefined, '7', 0, -1, 1.2])(
    'rejects invalid token subjects: %s',
    async (sub) => {
      jwt.verifyAsync.mockResolvedValue({ sub });
      await expect(
        guard.canActivate(context('Bearer token').context),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    },
  );
});

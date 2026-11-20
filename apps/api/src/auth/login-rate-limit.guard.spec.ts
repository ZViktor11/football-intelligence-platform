import { ExecutionContext, HttpException } from '@nestjs/common';
import { LoginRateLimitGuard } from './login-rate-limit.guard';

describe('Authentication rate limit', () => {
  it('limits per IP and expires after one minute', () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1000);
    try {
      const guard = new LoginRateLimitGuard();
      const setHeader = jest.fn();
      const context = (ip: string) => ({
        switchToHttp: () => ({
          getRequest: () => ({ ip }),
          getResponse: () => ({ setHeader }),
        }),
      }) as unknown as ExecutionContext;
      for (let i = 0; i < 10; i++) expect(guard.canActivate(context('one'))).toBe(true);
      expect(() => guard.canActivate(context('one'))).toThrow(HttpException);
      expect(setHeader).toHaveBeenCalledWith('Retry-After', 60);
      expect(guard.canActivate(context('two'))).toBe(true);
      clock.mockReturnValue(61_000);
      expect(guard.canActivate(context('one'))).toBe(true);
    } finally {
      clock.mockRestore();
    }
  });
});

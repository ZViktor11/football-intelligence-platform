import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';

// In-memory limit for a single API instance. Deployments with replicas need a shared store.
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly entries = new Map<string, { attempts: number; expires: number }>();
  private readonly windowMs = 60_000;
  private readonly limit = 10;

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expires <= now) this.entries.delete(key);
    }
    const key = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= 10_000) throw new HttpException('Too many authentication requests', HttpStatus.TOO_MANY_REQUESTS);
      entry = { attempts: 0, expires: now + this.windowMs };
      this.entries.set(key, entry);
    }
    if (++entry.attempts > this.limit) {
      response.setHeader('Retry-After', Math.ceil((entry.expires - now) / 1000));
      throw new HttpException('Too many authentication requests; try again later', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}

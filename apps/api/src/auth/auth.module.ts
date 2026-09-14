import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';
import { MatchAccessGuard } from './match-access.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],
  providers: [
    AuthService,
    AuthGuard,
    RolesGuard,
    MatchAccessGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    AuthGuard,
    RolesGuard,
    MatchAccessGuard,
    JwtModule,
  ],
})
export class AuthModule {}
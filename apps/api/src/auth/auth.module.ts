
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';
import { MatchAccessGuard } from './match-access.guard';
import { CompetitionAccessGuard } from './competition-access.guard';
import { FavoritesController } from './favorites.controller';
import { CompetitionCreateAccessGuard } from './competition-create-access.guard';

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
    CompetitionAccessGuard,
    CompetitionCreateAccessGuard,
  ],
  controllers: [AuthController, FavoritesController],
  exports: [
    AuthService,
    AuthGuard,
    RolesGuard,
    MatchAccessGuard,
    CompetitionAccessGuard,
    CompetitionCreateAccessGuard,
    JwtModule,
  ],
})
export class AuthModule {}

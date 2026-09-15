import { Module } from '@nestjs/common';

import { MatchSquadsController } from './match-squads.controller';
import { MatchSquadsService } from './match-squads.service';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [MatchSquadsController],
  providers: [MatchSquadsService],
})
export class MatchSquadsModule {}
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  providers: [TeamsService],
  controllers: [TeamsController],
})
export class TeamsModule {}
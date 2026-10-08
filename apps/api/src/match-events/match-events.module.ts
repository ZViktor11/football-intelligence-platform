import { Module } from '@nestjs/common';
import { MatchEventsController } from './match-events.controller';
import { MatchEventsService } from './match-events.service';
import { AuthModule } from '../auth/auth.module';
import { MatchesModule } from '../matches/matches.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuthModule, MatchesModule, AuditLogsModule],
  controllers: [MatchEventsController],
  providers: [MatchEventsService],
})
export class MatchEventsModule {}
import { Module } from '@nestjs/common';
import { MatchReportsService } from './match-reports.service';
import { MatchReportsController } from './match-reports.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [MatchReportsService],
  controllers: [MatchReportsController],
})
export class MatchReportsModule {}
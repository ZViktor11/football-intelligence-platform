import { IsEnum } from 'class-validator';
import { MatchReportStatus } from '../../../generated/prisma/client';

export class UpdateMatchReportStatusDto {
  @IsEnum(MatchReportStatus)
  status: MatchReportStatus;
}
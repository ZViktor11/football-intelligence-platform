import { IsEnum } from 'class-validator';
import { MatchStatus } from '../../../generated/prisma/client';

export class UpdateMatchStatusDto {
  @IsEnum(MatchStatus)
  status: MatchStatus;
}
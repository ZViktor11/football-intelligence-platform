import {
  IsEnum,
  IsInt,
} from 'class-validator';

import { MatchSquadRole } from '../../../generated/prisma/client';

export class CreateMatchSquadPlayerDto {
  @IsInt()
  matchId: number;

  @IsInt()
  teamId: number;

  @IsInt()
  playerId: number;

  @IsEnum(MatchSquadRole)
  role: MatchSquadRole;
}
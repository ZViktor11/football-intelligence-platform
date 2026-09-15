import { IsEnum, IsOptional } from 'class-validator';

import { MatchSquadRole } from '../../../generated/prisma/client';

export class UpdateMatchSquadPlayerDto {
  @IsOptional()
  @IsEnum(MatchSquadRole)
  role?: MatchSquadRole;
}
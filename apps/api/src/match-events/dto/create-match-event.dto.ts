import { IsBoolean, IsEnum, IsInt, ValidateIf, Min, Max } from 'class-validator';

import { MatchEventType } from '../../../generated/prisma/client';

export class CreateMatchEventDto {
  @IsEnum(MatchEventType)
  type: MatchEventType;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(120)
  minute?: number;

  @IsInt()
  @Min(1)
  matchId: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  teamId?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  playerId?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  assistPlayerId?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  staffMemberId?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  playerOutId?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  playerInId?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isOwnGoal?: boolean;
}

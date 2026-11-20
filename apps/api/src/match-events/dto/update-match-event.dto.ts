import { IsBoolean, IsEnum, IsInt, IsOptional, ValidateIf, Min, Max } from 'class-validator';

import { MatchEventType } from '../../../generated/prisma/client';

export class UpdateMatchEventDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(MatchEventType)
  type?: MatchEventType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  minute?: number | null;

  @IsOptional()
  @IsInt()
  teamId?: number | null;

  @IsOptional()
  @IsInt()
  playerId?: number | null;

  @IsOptional()
  @IsInt()
  assistPlayerId?: number | null;

  @IsOptional()
  @IsInt()
  staffMemberId?: number | null;

  @IsOptional()
  @IsInt()
  playerOutId?: number | null;

  @IsOptional()
  @IsInt()
  playerInId?: number | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isOwnGoal?: boolean;
}

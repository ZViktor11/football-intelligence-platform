import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

import { MatchEventType } from '../../../generated/prisma/client';

export class UpdateMatchEventDto {
  @IsOptional()
  @IsEnum(MatchEventType)
  type?: MatchEventType;

  @IsOptional()
  @IsInt()
  @Min(0)
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

  @IsOptional()
  @IsBoolean()
  isOwnGoal?: boolean;
}
import {
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
  minute?: number;

  @IsOptional()
  @IsInt()
  teamId?: number;

  @IsOptional()
  @IsInt()
  playerId?: number;

  @IsOptional()
  @IsInt()
  staffMemberId?: number;

  @IsOptional()
  @IsInt()
  playerOutId?: number;

  @IsOptional()
  @IsInt()
  playerInId?: number;
}
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MatchEventType } from '../../../generated/prisma/client';

export class CreateMatchEventDto {
  @IsEnum(MatchEventType)
  type: MatchEventType;

  @IsOptional()
  @IsInt()
  @Min(0)
  minute?: number;

  @IsInt()
  matchId: number;

  @IsOptional()
  @IsInt()
  playerId?: number;
}